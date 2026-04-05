import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormInput } from '@/components/ui/form-input';
import { FormSelect } from '@/components/ui/form-select';
import { FormTextarea } from '@/components/ui/form-textarea';
import { defaultTransaction, transactionTypeOptions } from './Inventory.constants';

const formatItemLabel = (item) => {
  const productName = item.lensProduct?.name || item.lensProduct?.lens_name || `Item #${item.id}`;
  const locationName = item.location?.name || '-';
  return `${productName} | Qty: ${item.quantity} | ${locationName}`;
};

export default function InventoryTransactionForm({
  initialData = null,
  dropdownData = {},
  onSubmit,
}) {
  const [formData, setFormData] = useState(defaultTransaction);
  const [errors, setErrors] = useState({});
  const [availableItems, setAvailableItems] = useState([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultTransaction,
        ...initialData,
      });
      return;
    }

    setFormData(defaultTransaction);
  }, [initialData]);

  useEffect(() => {
    if (dropdownData.inventoryItems) {
      setAvailableItems(dropdownData.inventoryItems);
    }
  }, [dropdownData]);

  const handleTransactionTypeChange = (type) => {
    const updates = {};

    switch (type) {
      case 'INWARD_PO':
      case 'INWARD_DIRECT':
        updates.quantity = Math.abs(formData.quantity || 1);
        break;
      case 'OUTWARD_SALE':
      case 'OUTWARD_RETURN':
      case 'DAMAGE':
        updates.quantity = -Math.abs(formData.quantity || 1);
        break;
      case 'TRANSFER':
        updates.quantity = formData.quantity || 0;
        break;
      default:
        break;
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }

    if (field === 'type') {
      handleTransactionTypeChange(value);
    }
  };

  const isInwardTransaction = ['INWARD_PO', 'INWARD_DIRECT'].includes(formData.type);
  const isOutwardTransaction = ['OUTWARD_SALE', 'OUTWARD_RETURN', 'DAMAGE'].includes(formData.type);
  const isTransferTransaction = formData.type === 'TRANSFER';

  const getFilteredItems = () => {
    if (!availableItems) return [];

    switch (formData.type) {
      case 'OUTWARD_SALE':
      case 'OUTWARD_RETURN':
      case 'DAMAGE':
        return availableItems.filter((item) => item.quantity > 0);
      case 'TRANSFER':
        if (formData.fromLocationId) {
          return availableItems.filter(
            (item) => item.location_id === formData.fromLocationId && item.quantity > 0
          );
        }
        return availableItems.filter((item) => item.quantity > 0);
      default:
        return availableItems;
    }
  };

  const filteredItems = useMemo(() => getFilteredItems(), [availableItems, formData.type, formData.fromLocationId]);

  const inventoryItemOptions = filteredItems.map((item) => ({
    value: item.id,
    label: formatItemLabel(item),
  }));

  const locationOptions = (dropdownData.locations || []).map((location) => ({
    value: location.id,
    label: location.name,
  }));

  const trayOptions = (dropdownData.trays || []).map((tray) => ({
    value: tray.id,
    label: tray.name,
  }));

  const purchaseOrderOptions = (dropdownData.purchaseOrders || []).map((po) => ({
    value: po.id,
    label: `${po.orderNumber} - ${po.vendor?.name || '-'}`,
  }));

  const saleOrderOptions = (dropdownData.saleOrders || []).map((saleOrder) => ({
    value: saleOrder.id,
    label: `${saleOrder.orderNumber} - ${saleOrder.customer?.name || '-'}`,
  }));

  const vendorOptions = (dropdownData.vendors || []).map((vendor) => ({
    value: vendor.id,
    label: vendor.name,
  }));

  const selectedItem = availableItems.find((item) => item.id === formData.inventoryItemId);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.type) {
      newErrors.type = 'Transaction type is required';
    }

    if (!formData.inventoryItemId && !['INWARD_PO', 'INWARD_DIRECT'].includes(formData.type)) {
      newErrors.inventoryItemId = 'Inventory item is required';
    }

    if (!formData.quantity || formData.quantity === 0) {
      newErrors.quantity = 'Quantity is required and cannot be zero';
    }

    if (formData.type === 'TRANSFER') {
      if (!formData.fromLocationId) {
        newErrors.fromLocationId = 'Source location is required for transfer';
      }
      if (!formData.toLocationId) {
        newErrors.toLocationId = 'Destination location is required for transfer';
      }
      if (formData.fromLocationId === formData.toLocationId) {
        newErrors.toLocationId = 'Destination must be different from source location';
      }
    }

    if (['INWARD_PO'].includes(formData.type) && !formData.purchaseOrderId) {
      newErrors.purchaseOrderId = 'Purchase Order is required for PO inward';
    }

    if (['OUTWARD_SALE'].includes(formData.type) && !formData.saleOrderId) {
      newErrors.saleOrderId = 'Sale Order is required for sale outward';
    }

    if (['OUTWARD_SALE', 'OUTWARD_RETURN', 'DAMAGE'].includes(formData.type)) {
      const item = availableItems.find((availableItem) => availableItem.id === formData.inventoryItemId);
      if (item && Math.abs(formData.quantity) > item.quantity) {
        newErrors.quantity = `Available quantity is ${item.quantity}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form id="inventory-transaction-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Transaction Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect
              label="Transaction Type"
              name="type"
              options={transactionTypeOptions.map((type) => ({ value: type.value, label: type.label }))}
              value={formData.type}
              onChange={(value) => handleChange('type', value)}
              placeholder="Select transaction type"
              isSearchable={false}
              isClearable={false}
              required
              error={errors.type}
            />

            <FormInput
              label="Quantity"
              name="quantity"
              type="number"
              step="0.1"
              value={Math.abs(formData.quantity) || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                const adjustedValue = isOutwardTransaction ? -Math.abs(value) : Math.abs(value);
                handleChange('quantity', adjustedValue);
              }}
              required
              error={errors.quantity}
              helperText={selectedItem && isOutwardTransaction ? `Available: ${selectedItem.quantity}` : undefined}
            />
          </div>

          <Alert className="bg-primary/5 border-primary/20">
            <AlertDescription className="text-xs">
              Choose the transaction type first. The form will automatically adjust required references, location fields, and quantity direction based on the selected inventory movement.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {!isInwardTransaction && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Item Selection</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-4">
            <FormSelect
              label="Inventory Item"
              name="inventoryItemId"
              options={inventoryItemOptions}
              value={formData.inventoryItemId}
              onChange={(value) => handleChange('inventoryItemId', value ? parseInt(value) : null)}
              placeholder="Select inventory item"
              isSearchable={true}
              isClearable={false}
              required
              error={errors.inventoryItemId}
            />

            {selectedItem && (
              <div className="rounded-md border bg-muted/20 p-3">
                <h4 className="text-sm font-medium mb-2">Selected Item Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Product:</span>
                    <span className="ml-2">{selectedItem.lensProduct?.name || selectedItem.lensProduct?.lens_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <span className="ml-2">{selectedItem.location?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Available:</span>
                    <span className="ml-2">{selectedItem.quantity}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="ml-2">₹{selectedItem.costPrice || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(isTransferTransaction || isInwardTransaction) && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {isTransferTransaction && (
                <FormSelect
                  label="From Location"
                  name="fromLocationId"
                  options={locationOptions}
                  value={formData.fromLocationId}
                  onChange={(value) => handleChange('fromLocationId', value ? parseInt(value) : null)}
                  placeholder="Select source location"
                  required
                  error={errors.fromLocationId}
                />
              )}

              <FormSelect
                label={isTransferTransaction ? 'To Location' : 'Location'}
                name="toLocationId"
                options={locationOptions}
                value={formData.toLocationId}
                onChange={(value) => handleChange('toLocationId', value ? parseInt(value) : null)}
                placeholder={isTransferTransaction ? 'Select destination location' : 'Select location'}
                required={isTransferTransaction || isInwardTransaction}
                error={errors.toLocationId}
              />

              {isTransferTransaction && (
                <FormSelect
                  label="From Tray"
                  name="fromTrayId"
                  options={trayOptions}
                  value={formData.fromTrayId}
                  onChange={(value) => handleChange('fromTrayId', value ? parseInt(value) : null)}
                  placeholder="Select source tray"
                  isClearable
                />
              )}

              <FormSelect
                label={isTransferTransaction ? 'To Tray' : 'Tray'}
                name="toTrayId"
                options={trayOptions}
                value={formData.toTrayId}
                onChange={(value) => handleChange('toTrayId', value ? parseInt(value) : null)}
                placeholder={isTransferTransaction ? 'Select destination tray' : 'Select tray'}
                isClearable
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Reference Details</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formData.type === 'INWARD_PO' && (
              <FormSelect
                label="Purchase Order"
                name="purchaseOrderId"
                options={purchaseOrderOptions}
                value={formData.purchaseOrderId}
                onChange={(value) => handleChange('purchaseOrderId', value ? parseInt(value) : null)}
                placeholder="Select purchase order"
                required
                error={errors.purchaseOrderId}
              />
            )}

            {formData.type === 'OUTWARD_SALE' && (
              <FormSelect
                label="Sale Order"
                name="saleOrderId"
                options={saleOrderOptions}
                value={formData.saleOrderId}
                onChange={(value) => handleChange('saleOrderId', value ? parseInt(value) : null)}
                placeholder="Select sale order"
                required
                error={errors.saleOrderId}
              />
            )}

            {['INWARD_DIRECT', 'INWARD_PO'].includes(formData.type) && (
              <FormSelect
                label="Vendor"
                name="vendorId"
                options={vendorOptions}
                value={formData.vendorId}
                onChange={(value) => handleChange('vendorId', value ? parseInt(value) : null)}
                placeholder="Select vendor"
                isClearable
              />
            )}

            <FormInput
              label="Unit Price"
              name="unitPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.unitPrice || ''}
              onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || null)}
              placeholder="Enter unit price"
              prefix="₹"
            />

            <FormInput
              label="Batch Number"
              name="batchNo"
              value={formData.batchNo}
              onChange={(e) => handleChange('batchNo', e.target.value)}
              placeholder="Enter batch number"
            />

            <FormInput
              label="Reason"
              name="reason"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Enter transaction reason"
            />
          </div>

          <FormTextarea
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Enter any additional notes..."
            rows={3}
          />
        </CardContent>
      </Card>
    </form>
  );
}
