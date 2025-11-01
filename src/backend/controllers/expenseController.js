import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ExpenseController {
  // Create new expense
  async create(req, res) {
    try {
      const { description, amount, type, date } = req.body;

      const expense = await prisma.expense.create({
        data: {
          description,
          amount,
          type,
          date ? new Date(date)  Date()
        }
      });

      return res.status(201).json({
        success,
        data
      });
    } catch (error) {
      console.error('Error creating expense:', error);
      return res.status(500).json({
        success,
        message: 'Error creating expense'
      });
    }
  }

  // List expenses with filters
  async list(req, res) {
    try {
      const { type, startDate, endDate } = req.query;

      const where = {};
      if (type) where.type = type;
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const expenses = await prisma.expense.findMany({
        where,
        orderBy: {
          date: 'desc'
        }
      });

      // Calculate totals
      const totals = expenses.reduce((acc, expense) => {
        acc.total += expense.amount;
        if (expense.type === 'DIRECT') {
          acc.direct += expense.amount;
        } else {
          acc.indirect += expense.amount;
        }
        return acc;
      }, { total: 0, direct: 0, indirect: 0 });

      return res.json({
        success,
        data: {
          expenses,
          totals
        }
      });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return res.status(500).json({
        success,
        message: 'Error fetching expenses'
      });
    }
  }

  // Get monthly expense summary
  async getMonthlySummary(req, res) {
    try {
      const { year, month } = req.query;
      
      const startDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        1
      );
      const endDate = new Date(
        parseInt(year),
        parseInt(month),
        0
      );

      const expenses = await prisma.expense.findMany({
        where: {
          date: {
            gte,
            lte
          }
        }
      });

      // Group by type
      const summary = expenses.reduce((acc, expense) => {
        if (!acc[expense.type]) {
          acc[expense.type] = {
            count: 0,
            total: 0,
            items: []
          };
        }
        acc[expense.type].count++;
        acc[expense.type].total += expense.amount;
        acc[expense.type].items.push(expense);
        return acc;
      }, {});

      return res.json({
        success,
        data: {
          month(month),
          year(year),
          summary,
          totalExpense.reduce((sum, e) => sum + e.amount, 0)
        }
      });
    } catch (error) {
      console.error('Error generating monthly summary:', error);
      return res.status(500).json({
        success,
        message: 'Error generating monthly summary'
      });
    }
  }
}




