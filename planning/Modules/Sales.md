# Sales Module — Sale Orders, Discounts, and Credit Lifecycle

This document details the Sale Order features, pricing logic, discount calculations, and the end-to-end credit exposure lifecycle.

## 1. Pricing & Discount Calculations
To ensure proper billing limits, discounts and promotional percentage offers apply **exclusively to the lens price** (coating price) and do not discount other order extras:
* **Subtotal Components:**
  * Lens Price (base)
  * Fitting Price
  * Tinting Price
  * Right/Left Eye Extra charges
  * Additional custom charges (JSON array)
* **Discount Calculation:**
  $$\text{Discount Amount} = \text{Lens Price} \times \frac{\text{Discount \%}}{100}$$
* **Final Total Calculation:**
  $$\text{Final Total} = \text{Lens Price} - \text{Discount Amount} + \text{Fitting Price} + \text{Tinting Price} + \text{Extras} + \text{Additional Charges}$$

## 2. Credit Exposure Lifecycle (Reserve vs Outstanding)
The system tracks exposure dynamically at every stage of the sale:

```mermaid
graph TD
    A[SO Created] -->|Reserved Increment| B(reserved_amount += finalTotal)
    B -->|Invoice Created| C(reserved_amount -= finalTotal <br> outstanding_credit += finalTotal)
    C -->|Payment Recorded| D(outstanding_credit -= paymentAmount)
    B -->|SO Deleted/Cancelled| E(reserved_amount -= finalTotal)
    C -->|Invoice Cancelled| F(outstanding_credit -= finalTotal <br> reserved_amount += finalTotal)
```

### A. SO Created
* Adds computed `finalTotal` to `customer.reserved_amount`.
* **Credit Block:** If `credit_limit > 0` and `reserved_amount + outstanding_credit + newSOTotal >= credit_limit`, the system blocks order creation with a `CREDIT_LIMIT_EXCEEDED` error.

### B. Invoice Created
* Links the Sale Order(s) to an Invoice.
* Moves the invoiced amount from `reserved_amount` to `outstanding_credit`.

### C. Payment Recorded
* Reduces `outstanding_credit` by the payment amount.
* If fully paid, sets the Sale Order status to `COMPLETED`.

### D. Reversals (Delete / Cancel)
* **Delete Sale Order:** Decrements `reserved_amount` by the SO total (only if uninvoiced).
* **Cancel Invoice:** Decrements `outstanding_credit` and increments `reserved_amount` back to indicate active reservation.

## Linkages & Dependencies
* **CRM Module:** References `Customer` records and updates credit fields.
* **Accounting Module:** Posts client payments and double-entry sales revenue ledger updates.
