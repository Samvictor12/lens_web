import prisma from "../config/prisma.js";
import { APIError } from "../middleware/errorHandler.js";
import { calendarMonthWindow, coalescePower, inventoryItemGodownWhere } from "./inventory.service.js";
import { classifyCycleCountOutcome, summarizeCycleCountKpis } from "./inventoryCycleCount.helpers.js";

const OPEN_STATUSES = ["PLANNED", "IN_PROGRESS", "PENDING_REVIEW"];

function lineInclude() {
  return {
    tray: { select: { id: true, name: true } },
    location: { select: { id: true, name: true } },
    inventoryItem: {
      select: {
        id: true,
        quantity: true,
        status: true,
        lensProduct: { select: { id: true, lens_name: true, product_code: true } },
      },
    },
  };
}

async function generateSessionNo(db = prisma) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const prefix = `CC-${year}-${month}-`;
  const latest = await db.inventoryCycleCountSession.findFirst({
    where: { sessionNo: { startsWith: prefix } },
    orderBy: { sessionNo: "desc" },
    select: { sessionNo: true },
  });
  let sequence = 1;
  if (latest?.sessionNo) {
    const parts = latest.sessionNo.split("-");
    sequence = parseInt(parts[3], 10) + 1;
  }
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

async function traysInScope(godownType, locationId) {
  return prisma.trayMaster.findMany({
    where: {
      deleteStatus: false,
      activeStatus: true,
      location_id: locationId ? locationId : { not: null },
      location: {
        deleteStatus: false,
        activeStatus: true,
        godownType,
        ...(locationId ? { id: locationId } : {}),
      },
    },
    select: { id: true, name: true, location_id: true, location: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
}

function sessionKpis(session, scopeTrayCount) {
  const countedTrayIds = [
    ...new Set(
      (session.lines || [])
        .filter((l) => l.outcome && l.outcome !== "UNCOUNTED")
        .map((l) => l.tray_id)
    ),
  ];
  return summarizeCycleCountKpis({
    traysInScope: scopeTrayCount,
    trayIdsCounted: countedTrayIds,
    lines: session.lines || [],
  });
}

async function refreshSessionStatus(sessionId, userId) {
  const session = await prisma.inventoryCycleCountSession.findUnique({
    where: { id: sessionId },
    include: { lines: true },
  });
  if (!session || session.status === "POSTED" || session.status === "CANCELLED") return session;

  const hasPending = session.lines.some((l) => l.outcome === "PENDING_RECOUNT");
  const hasCounted = session.lines.some((l) => l.outcome !== "UNCOUNTED");
  let status = session.status;
  if (hasPending) status = "PENDING_REVIEW";
  else if (hasCounted) status = "IN_PROGRESS";

  return prisma.inventoryCycleCountSession.update({
    where: { id: sessionId },
    data: {
      status,
      startedAt: session.startedAt || (hasCounted ? new Date() : undefined),
      updatedBy: userId,
    },
    include: { lines: { include: lineInclude() }, location: { select: { id: true, name: true } } },
  });
}

export async function createCycleCountSession({ godownType, locationId, recountThreshold, notes, createdBy }) {
  if (godownType !== "STOCK" && godownType !== "RX") {
    throw new APIError("godownType must be STOCK or RX", 400, "INVALID_GODOWN");
  }
  const open = await prisma.inventoryCycleCountSession.findFirst({
    where: { godownType, status: { in: OPEN_STATUSES } },
  });
  if (open) {
    throw new APIError(
      `Open cycle count ${open.sessionNo} already exists for this godown`,
      409,
      "CYCLE_COUNT_OPEN"
    );
  }
  if (locationId) {
    const loc = await prisma.locationMaster.findFirst({
      where: { id: locationId, deleteStatus: false, godownType },
    });
    if (!loc) throw new APIError("Location not found in this godown", 400, "INVALID_LOCATION");
  }
  const sessionNo = await generateSessionNo();
  return prisma.inventoryCycleCountSession.create({
    data: {
      sessionNo,
      godownType,
      location_id: locationId || null,
      recountThreshold: recountThreshold == null ? 0 : Number(recountThreshold),
      notes: notes || null,
      createdBy,
    },
    include: { location: { select: { id: true, name: true } }, lines: true },
  });
}

export async function listCycleCountSessions({ godownType, limit = 20 }) {
  return prisma.inventoryCycleCountSession.findMany({
    where: godownType ? { godownType } : {},
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit) || 20, 100),
    include: {
      location: { select: { id: true, name: true } },
      _count: { select: { lines: true } },
    },
  });
}

export async function getCycleCountSession(id, godownType) {
  const session = await prisma.inventoryCycleCountSession.findUnique({
    where: { id: Number(id) },
    include: {
      location: { select: { id: true, name: true } },
      lines: { include: lineInclude(), orderBy: [{ tray_id: "asc" }, { id: "asc" }] },
    },
  });
  if (!session) throw new APIError("Cycle count session not found", 404, "NOT_FOUND");
  if (godownType && session.godownType !== godownType) {
    throw new APIError("Cycle count session not found", 404, "NOT_FOUND");
  }
  const scope = await traysInScope(session.godownType, session.location_id);
  return { ...session, kpis: sessionKpis(session, scope.length), scopeTrays: scope };
}

export async function getTrayBook({ sessionId, trayId, godownType }) {
  if (!trayId) throw new APIError("trayId is required", 400, "INVALID_TRAY");
  const session = await prisma.inventoryCycleCountSession.findUnique({
    where: { id: Number(sessionId) },
  });
  if (!session) throw new APIError("Cycle count session not found", 404, "NOT_FOUND");
  if (godownType && session.godownType !== godownType) {
    throw new APIError("Cycle count session not found", 404, "NOT_FOUND");
  }
  const tray = await prisma.trayMaster.findFirst({
    where: {
      id: Number(trayId),
      deleteStatus: false,
      location: { godownType: session.godownType, deleteStatus: false },
    },
    include: { location: { select: { id: true, name: true, godownType: true } } },
  });
  if (!tray) throw new APIError("Tray not found in this godown", 400, "INVALID_TRAY");
  if (session.location_id && tray.location_id !== session.location_id) {
    throw new APIError("Tray is outside session location scope", 400, "TRAY_OUT_OF_SCOPE");
  }

  const items = await prisma.inventoryItem.findMany({
    where: inventoryItemGodownWhere(session.godownType, {
      tray_id: tray.id,
      deleteStatus: false,
      activeStatus: true,
      status: "AVAILABLE",
      quantity: { gt: 0 },
    }),
    include: {
      lensProduct: { select: { id: true, lens_name: true, product_code: true } },
    },
    orderBy: { id: "asc" },
  });

  const existing = await prisma.inventoryCycleCountLine.findMany({
    where: { sessionId: session.id, tray_id: tray.id },
  });
  const byItem = new Map(existing.map((l) => [l.inventoryItemId, l]));

  const book = items.map((item) => {
    const power = coalescePower(item);
    const line = byItem.get(item.id);
    return {
      inventoryItemId: item.id,
      lens_id: item.lens_id,
      lens_name: item.lensProduct?.lens_name,
      product_code: item.lensProduct?.product_code,
      sph: power.sph,
      cyl: power.cyl,
      add: power.add,
      bookQty: item.quantity,
      countedQty: line?.countedQty ?? null,
      varianceQty: line?.varianceQty ?? null,
      outcome: line?.outcome || "UNCOUNTED",
      lineId: line?.id || null,
      recountCount: line?.recountCount || 0,
    };
  });

  return {
    tray: { id: tray.id, name: tray.name, location: tray.location },
    book,
  };
}

export async function recordTrayCount({ sessionId, trayId, lines, userId, godownType }) {
  const session = await prisma.inventoryCycleCountSession.findUnique({
    where: { id: Number(sessionId) },
  });
  if (!session) throw new APIError("Cycle count session not found", 404, "NOT_FOUND");
  if (godownType && session.godownType !== godownType) {
    throw new APIError("Cycle count session not found", 404, "NOT_FOUND");
  }
  if (session.status === "POSTED" || session.status === "CANCELLED") {
    throw new APIError("Session is closed", 400, "SESSION_CLOSED");
  }
  const snapshot = await getTrayBook({ sessionId: session.id, trayId, godownType: session.godownType });
  const bookByItem = new Map(snapshot.book.map((b) => [b.inventoryItemId, b]));
  const incoming = Array.isArray(lines) ? lines : [];
  if (!incoming.length) throw new APIError("Count lines are required", 400, "NO_LINES");

  await prisma.$transaction(async (tx) => {
    for (const row of incoming) {
      const itemId = Number(row.inventoryItemId);
      const bookRow = bookByItem.get(itemId);
      if (!bookRow) {
        throw new APIError(`Item ${itemId} is not in tray book`, 400, "ITEM_NOT_IN_BOOK");
      }
      const countedQty = Number(row.countedQty);
      if (Number.isNaN(countedQty) || countedQty < 0) {
        throw new APIError("countedQty must be a number ≥ 0", 400, "INVALID_QTY");
      }
      const isRecount = Boolean(bookRow.lineId) && bookRow.outcome === "PENDING_RECOUNT";
      const outcome = classifyCycleCountOutcome({
        bookQty: bookRow.bookQty,
        countedQty,
        recountThreshold: session.recountThreshold,
        isRecount,
      });
      const varianceQty = countedQty - bookRow.bookQty;
      const locationId = snapshot.tray.location?.id;
      if (!locationId) throw new APIError("Tray has no location", 400, "NO_LOCATION");

      const data = {
        location_id: locationId,
        tray_id: snapshot.tray.id,
        inventoryItemId: itemId,
        lens_id: bookRow.lens_id,
        sph: bookRow.sph,
        cyl: bookRow.cyl,
        add: bookRow.add,
        bookQty: bookRow.bookQty,
        countedQty,
        varianceQty,
        outcome,
        recountCount: isRecount ? (bookRow.recountCount || 0) + 1 : bookRow.recountCount || 0,
        countedAt: new Date(),
        notes: row.notes || null,
        updatedBy: userId,
      };

      if (bookRow.lineId) {
        await tx.inventoryCycleCountLine.update({
          where: { id: bookRow.lineId },
          data,
        });
      } else {
        await tx.inventoryCycleCountLine.create({
          data: { sessionId: session.id, ...data },
        });
      }
    }
  });

  return refreshSessionStatus(session.id, userId);
}

export async function recountLine({ sessionId, lineId, countedQty, userId, godownType }) {
  const line = await prisma.inventoryCycleCountLine.findFirst({
    where: { id: Number(lineId), sessionId: Number(sessionId) },
  });
  if (!line) throw new APIError("Count line not found", 404, "NOT_FOUND");
  return recordTrayCount({
    sessionId,
    trayId: line.tray_id,
    lines: [{ inventoryItemId: line.inventoryItemId, countedQty }],
    userId,
    godownType,
  });
}

export async function acceptVariance({ sessionId, lineId, userId, godownType }) {
  const line = await prisma.inventoryCycleCountLine.findFirst({
    where: { id: Number(lineId), sessionId: Number(sessionId) },
    include: { session: true },
  });
  if (!line) throw new APIError("Count line not found", 404, "NOT_FOUND");
  if (godownType && line.session.godownType !== godownType) {
    throw new APIError("Count line not found", 404, "NOT_FOUND");
  }
  if (line.session.status === "POSTED" || line.session.status === "CANCELLED") {
    throw new APIError("Session is closed", 400, "SESSION_CLOSED");
  }
  if (line.outcome !== "PENDING_RECOUNT") {
    throw new APIError("Only pending-recount lines can accept variance", 400, "INVALID_OUTCOME");
  }
  const variance = (Number(line.countedQty) || 0) - (Number(line.bookQty) || 0);
  const outcome = variance < 0 ? "SHORTAGE" : "OVERAGE";
  await prisma.inventoryCycleCountLine.update({
    where: { id: line.id },
    data: { outcome, varianceQty: variance, updatedBy: userId },
  });
  return refreshSessionStatus(line.sessionId, userId);
}

export async function postCycleCountSession({ sessionId, userId, godownType }) {
  const session = await prisma.inventoryCycleCountSession.findUnique({
    where: { id: Number(sessionId) },
    include: { lines: true },
  });
  if (!session) throw new APIError("Cycle count session not found", 404, "NOT_FOUND");
  if (godownType && session.godownType !== godownType) {
    throw new APIError("Cycle count session not found", 404, "NOT_FOUND");
  }
  if (session.status === "POSTED") return session;
  if (session.status === "CANCELLED") throw new APIError("Session is cancelled", 400, "SESSION_CLOSED");
  const countedTrayIds = new Set(
    session.lines.filter((l) => l.outcome && l.outcome !== "UNCOUNTED").map((l) => l.tray_id)
  );
  if (!countedTrayIds.size) throw new APIError("No counted trays to post", 400, "EMPTY_SESSION");
  const blocked = session.lines.filter(
    (l) =>
      countedTrayIds.has(l.tray_id) &&
      (l.outcome === "PENDING_RECOUNT" || l.outcome === "UNCOUNTED")
  );
  if (blocked.length) {
    throw new APIError(
      "Resolve pending recounts before posting",
      400,
      "PENDING_RECOUNT"
    );
  }
  return prisma.inventoryCycleCountSession.update({
    where: { id: session.id },
    data: { status: "POSTED", postedAt: new Date(), postedBy: userId, updatedBy: userId },
    include: { lines: { include: lineInclude() }, location: { select: { id: true, name: true } } },
  });
}

export async function getCycleCountDashboardKpis(godownType) {
  const empty = summarizeCycleCountKpis({ traysInScope: 0, trayIdsCounted: [], lines: [] });
  if (godownType !== "STOCK" && godownType !== "RX") {
    return { ...empty, sessionId: null, sessionNo: null, status: null };
  }
  let session = await prisma.inventoryCycleCountSession.findFirst({
    where: { godownType, status: { in: OPEN_STATUSES } },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });
  if (!session) {
    const { start } = calendarMonthWindow();
    session = await prisma.inventoryCycleCountSession.findFirst({
      where: { godownType, status: "POSTED", postedAt: { gte: start } },
      include: { lines: true },
      orderBy: { postedAt: "desc" },
    });
  }
  if (!session) {
    return { ...empty, sessionId: null, sessionNo: null, status: null };
  }
  const scope = await traysInScope(session.godownType, session.location_id);
  return {
    ...sessionKpis(session, scope.length),
    sessionId: session.id,
    sessionNo: session.sessionNo,
    status: session.status,
  };
}
