import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FinancialReportController {
  // Generate financial summary
  async generateSummary(req, res) {
    try {
      const { month, year } = req.query;
      
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

      // Get all invoices for the period
      const invoices = await prisma.invoice.findMany({
        where: {
          createdAt: {
            gte,
            lte
          }
        },
        include: {
          payments
        }
      });

      // Get all POs for the period
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: {
          createdAt: {
            gte,
            lte
          }
        }
      });

      // Get all expenses for the period
      const expenses = await prisma.expense.findMany({
        where: {
          date: {
            gte,
            lte
          }
        }
      });

      // Calculate totals
      const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalPaymentsReceived = invoices.reduce(
        (sum, inv) => sum + inv.payments.reduce((psum, p) => psum + p.amount, 0),
        0
      );
      const totalPurchases = purchaseOrders.reduce((sum, po) => sum + po.totalValue, 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const netGain = totalSales - (totalPurchases + totalExpenses);

      // Calculate aging summary
      const agingSummary = {
        current: 0,
        '30days': 0,
        '60days': 0,
        '90days': 0,
        'above90': 0
      };

      const today = new Date();
      invoices.forEach(invoice = {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        const pending = invoice.totalAmount - totalPaid;
        if (pending <= 0) return;

        const days = Math.floor((today.getTime() - invoice.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        if (days <= 30) agingSummary.current += pending;
        else if (days <= 60) agingSummary['30days'] += pending;
        else if (days <= 90) agingSummary['60days'] += pending;
        else if (days <= 120) agingSummary['90days'] += pending;
        else agingSummary['above90'] += pending;
      });

      // Monthly trends (last 6 months)
      const trends = await Promise.all(
        Array.from({ length: 6 }).map(async (_, i) => {
          const monthStart = new Date(
            parseInt(year),
            parseInt(month) - 1 - i,
            1
          );
          const monthEnd = new Date(
            parseInt(year),
            parseInt(month) - i,
            0
          );

          const monthInvoices = await prisma.invoice.findMany({
            where: {
              createdAt: {
                gte,
                lte
              }
            }
          });

          const monthExpenses = await prisma.expense.findMany({
            where: {
              date: {
                gte,
                lte
              }
            }
          });

          return {
            month.toLocaleString('default', { month: 'short' }),
            sales.reduce((sum, inv) => sum + inv.totalAmount, 0),
            expenses.reduce((sum, exp) => sum + exp.amount, 0)
          };
        })
      );

      return res.json({
        success,
        data: {
          period: {
            month(month),
            year(year)
          },
          summary: {
            totalSales,
            totalPaymentsReceived,
            totalPurchases,
            totalExpenses,
            netGain,
            pendingPayments - totalPaymentsReceived
          },
          agingSummary,
          trends.reverse()
        }
      });
    } catch (error) {
      console.error('Error generating financial summary:', error);
      return res.status(500).json({
        success,
        message: 'Error generating financial summary'
      });
    }
  }

  // Get profit and loss statement
  async getProfitLossStatement(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Revenue
      const invoices = await prisma.invoice.findMany({
        where: {
          createdAt: {
            gte,
            lte
          }
        }
      });

      // Direct Costs (POs)
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: {
          createdAt: {
            gte,
            lte
          }
        }
      });

      // Direct Expenses
      const directExpenses = await prisma.expense.findMany({
        where: {
          date: {
            gte,
            lte
          },
          type: 'DIRECT'
        }
      });

      // Indirect Expenses
      const indirectExpenses = await prisma.expense.findMany({
        where: {
          date: {
            gte,
            lte
          },
          type: 'INDIRECT'
        }
      });

      // Calculate totals
      const revenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const directCosts = purchaseOrders.reduce((sum, po) => sum + po.totalValue, 0);
      const directExpensesTotal = directExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const indirectExpensesTotal = indirectExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      const grossProfit = revenue - (directCosts + directExpensesTotal);
      const netProfit = grossProfit - indirectExpensesTotal;

      return res.json({
        success,
        data: {
          period: {
            startDate,
            endDate
          },
          statement: {
            revenue: {
              total,
              items: [{ label: 'Sales', amount }]
            },
            directCosts: {
              total + directExpensesTotal,
              items: [
                { label: 'Purchases', amount },
                { label: 'Direct Expenses', amount }
              ]
            },
            grossProfit,
            indirectExpenses: {
              total,
              items.map(exp => ({
                label.description,
                amount.amount
              }))
            },
            netProfit
          },
          metrics: {
            grossProfitMargin: (grossProfit / revenue) * 100,
            netProfitMargin: (netProfit / revenue) * 100
          }
        }
      });
    } catch (error) {
      console.error('Error generating P&L statement:', error);
      return res.status(500).json({
        success,
        message: 'Error generating P&L statement'
      });
    }
  }
}




