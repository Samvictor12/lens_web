import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

function sumLedgerBalances(ledgers) {
  return ledgers.reduce((s, l) => s + parseFloat(l.currentBalance || 0), 0);
}

export class AccountGroupService {

  async listTree() {
    const [groups, ledgers] = await Promise.all([
      prisma.accountGroup.findMany({
        where: { delete_status: false, active_status: true },
        orderBy: [{ sortOrder: 'asc' }, { groupName: 'asc' }],
      }),
      prisma.ledger.findMany({
        where: { delete_status: false, active_status: true },
        select: {
          id: true,
          ledgerCode: true,
          ledgerName: true,
          ledgerType: true,
          accountGroupId: true,
          currentBalance: true,
          isGroupLedger: true,
          allowsDirectPosting: true,
          parentLedgerId: true,
        },
        orderBy: [{ ledgerCode: 'asc' }],
      }),
    ]);

    const ledgersByGroup = {};
    for (const l of ledgers) {
      if (!l.accountGroupId) continue;
      if (!ledgersByGroup[l.accountGroupId]) ledgersByGroup[l.accountGroupId] = [];
      ledgersByGroup[l.accountGroupId].push(l);
    }

    const byId = Object.fromEntries(groups.map((g) => [g.id, { ...g, childGroups: [], ledgers: ledgersByGroup[g.id] || [] }]));
    const roots = [];
    for (const g of groups) {
      const node = byId[g.id];
      if (g.parentGroupId && byId[g.parentGroupId]) {
        byId[g.parentGroupId].childGroups.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getById(id) {
    const group = await prisma.accountGroup.findFirst({
      where: { id: parseInt(id), delete_status: false },
      include: {
        parentGroup: { select: { id: true, groupCode: true, groupName: true } },
        childGroups: { where: { delete_status: false }, orderBy: { sortOrder: 'asc' } },
        ledgers: {
          where: { delete_status: false },
          select: {
            id: true, ledgerCode: true, ledgerName: true, ledgerType: true,
            currentBalance: true, isGroupLedger: true, allowsDirectPosting: true,
          },
        },
      },
    });
    if (!group) throw new APIError('Account group not found', 404, 'NOT_FOUND');
    return group;
  }

  async getSummary({ groupId, asOf }) {
    const gid = groupId ? parseInt(groupId) : null;
    if (!gid) throw new APIError('groupId is required', 400, 'VALIDATION_ERROR');

    const group = await this.getById(gid);
    const allGroups = await prisma.accountGroup.findMany({
      where: { delete_status: false, active_status: true },
    });
    const childGroupIds = this._collectDescendantGroupIds(gid, allGroups);

    const ledgers = await prisma.ledger.findMany({
      where: {
        delete_status: false,
        accountGroupId: { in: [gid, ...childGroupIds] },
        allowsDirectPosting: true,
        isGroupLedger: false,
      },
      select: { id: true, ledgerCode: true, ledgerName: true, currentBalance: true, accountGroupId: true },
      orderBy: { ledgerCode: 'asc' },
    });

    const childSummaries = [];
    for (const cg of group.childGroups || []) {
      const sub = await this.getSummary({ groupId: cg.id, asOf });
      childSummaries.push(sub);
    }

    const directTotal = sumLedgerBalances(ledgers.filter((l) => l.accountGroupId === gid));
    const childTotal = childSummaries.reduce((s, c) => s + parseFloat(c.totalBalance || 0), 0);
    const nestedLedgerTotal = sumLedgerBalances(ledgers.filter((l) => l.accountGroupId !== gid));

    return {
      group: {
        id: group.id,
        groupCode: group.groupCode,
        groupName: group.groupName,
        nature: group.nature,
        reportSection: group.reportSection,
        pnlClassification: group.pnlClassification,
      },
      asOf: asOf || null,
      ledgers: ledgers.filter((l) => l.accountGroupId === gid).map((l) => ({
        id: l.id,
        ledgerCode: l.ledgerCode,
        ledgerName: l.ledgerName,
        balance: parseFloat(l.currentBalance).toFixed(2),
      })),
      childGroups: childSummaries,
      totalBalance: (directTotal + childTotal).toFixed(2),
    };
  }

  _collectDescendantGroupIds(rootId, allGroups) {
    const ids = [];
    const queue = allGroups.filter((g) => g.parentGroupId === rootId).map((g) => g.id);
    while (queue.length) {
      const id = queue.shift();
      ids.push(id);
      queue.push(...allGroups.filter((g) => g.parentGroupId === id).map((g) => g.id));
    }
    return ids;
  }

  async findByCode(groupCode) {
    return prisma.accountGroup.findFirst({
      where: { groupCode, delete_status: false, active_status: true },
    });
  }

  async generateGroupCode(groupName) {
    const slug = groupName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'GROUP';
    let code = `GRP-${slug}`;
    let n = 1;
    while (await this.findByCode(code)) {
      code = `GRP-${slug}-${n++}`;
    }
    return code;
  }

  async create({ groupName, parentGroupId, pnlClassification }, userId) {
    if (!groupName?.trim()) {
      throw new APIError('groupName is required', 400, 'VALIDATION_ERROR');
    }
    if (!parentGroupId) {
      throw new APIError('parentGroupId is required', 400, 'VALIDATION_ERROR');
    }

    const parent = await prisma.accountGroup.findFirst({
      where: { id: parseInt(parentGroupId), delete_status: false, active_status: true },
    });
    if (!parent) throw new APIError('Parent account group not found', 404, 'NOT_FOUND');

    const siblingMax = await prisma.accountGroup.aggregate({
      where: { parentGroupId: parent.id, delete_status: false },
      _max: { sortOrder: true },
    });

    const resolvedPnl =
      pnlClassification && pnlClassification !== 'NOT_APPLICABLE'
        ? pnlClassification
        : parent.pnlClassification;

    return prisma.accountGroup.create({
      data: {
        groupCode: await this.generateGroupCode(groupName),
        groupName: groupName.trim(),
        nature: parent.nature,
        parentGroupId: parent.id,
        reportSection: parent.reportSection,
        pnlClassification: resolvedPnl,
        isSystemGroup: false,
        sortOrder: (siblingMax._max.sortOrder ?? parent.sortOrder) + 1,
        createdBy: userId,
      },
    });
  }
}

export default AccountGroupService;
