# CRM Module — Customer Master & Opening Balance

This document details the Customer Master and Customer Portal configurations, including credit limits, outstanding balances, and opening balances.

## Functional Overview
* **Customer Profile:** Holds general billing, shipping, GSTIN, and contact details.
* **Credit Tracking:** Houses `credit_limit`, `credit_days`, `outstanding_credit`, `reserved_amount`, and `advance_credit`.
* **Opening Balance Management:** Allows administrators to initialize or adjust a customer's opening balance.

## Opening Balance Workflow
To set or update a customer's opening balance:
1. Admins enter the amount from the Customer edit/detail view.
2. The backend performs a double-entry transaction:
   * **DEBIT** is posted to the Customer AR Subsidiary Ledger (`AC-1003-C[id]`).
   * **CREDIT** is posted to the Equity Offset Ledger (`AC-5002 Retained Earnings`).
3. The customer's `outstanding_credit` is adjusted dynamically by the difference:
   $$\text{New Outstanding} = \max(0, \text{Current Outstanding} + (\text{New Opening Balance} - \text{Old Opening Balance}))$$

## Database Fields
* **Customer table:**
  * `credit_limit` (Float): Hard limit for customer exposure.
  * `credit_days` (Int?, 2026-07-14): Payment terms in days; used to default `Invoice.dueDate` = invoice date + credit days.
  * `outstanding_credit` (Float): Amount currently invoiced but unpaid.
  * `reserved_amount` (Float): Amount reserved for uninvoiced/active Sale Orders.
  * `advance_credit` (Float): Prepaid / overpayment balance from customer payment vouchers.
  * `ledgerId` (Int): Reference to the customer's AR subsidiary ledger.

## Linkages & Dependencies
* **Accounting Module:** Integrates with the General Ledger (`Ledger` table) and transaction journal (`FinancialTransaction`, `TransactionEntry` tables) using `postTransaction()`.
* **Sales Module:** Credit checks limit prospective Sale Order creation when `reserved_amount + outstanding_credit + prospectiveTotal >= credit_limit`.
