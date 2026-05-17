import { InvoiceService } from '../services/invoiceService.js';

const service = new InvoiceService();

export class InvoiceController {

  /** POST /api/invoices — create invoice from delivered sale orders */
  async create(req, res, next) {
    try {
      const invoice = await service.createInvoice(req.body, req.user.id, req);
      res.status(201).json({ success: true, message: 'Invoice created successfully', data: invoice });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/invoices — list invoices */
  async list(req, res, next) {
    try {
      const result = await service.getInvoices(req.query);
      res.status(200).json({ success: true, message: 'Invoices retrieved successfully', ...result });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/invoices/:id — get invoice by ID */
  async getById(req, res, next) {
    try {
      const invoice = await service.getInvoiceById(parseInt(req.params.id));
      res.status(200).json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/invoices/:id/payments — record a payment */
  async recordPayment(req, res, next) {
    try {
      const invoice = await service.recordPayment(parseInt(req.params.id), req.body, req.user.id, req);
      res.status(200).json({ success: true, message: 'Payment recorded successfully', data: invoice });
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /api/invoices/:id/issue — issue invoice (DRAFT → ISSUED) */
  async issue(req, res, next) {
    try {
      const invoice = await service.issueInvoice(parseInt(req.params.id), req.user.id, req);
      res.status(200).json({ success: true, message: 'Invoice issued successfully', data: invoice });
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /api/invoices/:id/cancel — cancel invoice */
  async cancel(req, res, next) {
    try {
      const invoice = await service.cancelInvoice(parseInt(req.params.id), req.user.id, req);
      res.status(200).json({ success: true, message: 'Invoice cancelled successfully', data: invoice });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/invoices/customers/:customerId/delivered-orders — delivered orders ready for billing */
  async getDeliveredOrders(req, res, next) {
    try {
      const orders = await service.getDeliveredOrders(req.params.customerId);
      res.status(200).json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/invoices/dispatched-orders — all DELIVERED un-billed orders for billing screen */
  async getAllDispatchedOrders(req, res, next) {
    try {
      const result = await service.getAllDispatchedOrders(req.query);
      res.status(200).json({ success: true, message: 'Dispatched orders retrieved', ...result });
    } catch (error) {
      next(error);
    }
  }
}
