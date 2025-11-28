import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Package, Save, X } from 'lucide-react';
import {
  defaultTransaction,
  transactionTypeOptions,
} from './Inventory.constants';

const InventoryTransactionForm = ({ 
  initialData = null, 
  dropdownData = {}, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState(defaultTransaction);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultTransaction,
        ...initialData,
      });
    } else {
      setFormData(defaultTransaction);
    }
  }, [initialData]);

  useEffect(() => {
    // Load available inventory items
    if (dropdownData.inventoryItems) {
      setAvailableItems(dropdownData.inventoryItems);
    }
  }, [dropdownData]);

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Auto-populate related fields based on transaction type
    if (field === 'type') {
      handleTransactionTypeChange(value);
    }
  };

  // Handle transaction type specific logic
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
      case 'ADJUSTMENT':
        // Keep current quantity for adjustment
        break;
      default:
        break;
    }

    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Get filtered items based on transaction type
  const getFilteredItems = () => {
    if (!availableItems) return [];
    
    switch (formData.type) {
      case 'OUTWARD_SALE':
      case 'OUTWARD_RETURN':
      case 'DAMAGE':
        // Only show items with available quantity
        return availableItems.filter(item => item.quantity > 0);
      case 'TRANSFER':
        // Show items from selected source location
        if (formData.fromLocationId) {
          return availableItems.filter(item => 
            item.location_id === formData.fromLocationId && item.quantity > 0
          );
        }
        return availableItems.filter(item => item.quantity > 0);
      default:
        return availableItems;
    }
  };

  // Validate form
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

    // Type-specific validations
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

    // Check available quantity for outward transactions
    if (['OUTWARD_SALE', 'OUTWARD_RETURN', 'DAMAGE'].includes(formData.type)) {
      const selectedItem = availableItems.find(item => item.id === formData.inventoryItemId);
      if (selectedItem && Math.abs(formData.quantity) > selectedItem.quantity) {
        newErrors.quantity = `Available quantity is ${selectedItem.quantity}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get selected item details
  const selectedItem = availableItems.find(item => item.id === formData.inventoryItemId);

  // Determine if transaction is inward or outward
  const isInwardTransaction = ['INWARD_PO', 'INWARD_DIRECT'].includes(formData.type);
  const isOutwardTransaction = ['OUTWARD_SALE', 'OUTWARD_RETURN', 'DAMAGE'].includes(formData.type);
  const isTransferTransaction = formData.type === 'TRANSFER';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Transaction Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Transaction Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Transaction Type */}
            <div>
              <Label htmlFor="type">
                Transaction Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange('type', value)}
              >
                <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypeOptions.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-500 mt-1">{errors.type}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">
                Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                value={Math.abs(formData.quantity) || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  const adjustedValue = isOutwardTransaction ? -Math.abs(value) : Math.abs(value);
                  handleChange('quantity', adjustedValue);
                }}
                className={errors.quantity ? 'border-red-500' : ''}
                placeholder="Enter quantity"
              />
              {errors.quantity && (
                <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>
              )}
              {selectedItem && isOutwardTransaction && (
                <p className="text-sm text-gray-500 mt-1">
                  Available: {selectedItem.quantity}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Item Selection */}
      {!isInwardTransaction && (
        <Card>
          <CardHeader>
            <CardTitle>Item Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="inventoryItemId">
                Inventory Item <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.inventoryItemId?.toString()}
                onValueChange={(value) => handleChange('inventoryItemId', parseInt(value))}
              >
                <SelectTrigger className={errors.inventoryItemId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select inventory item" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredItems().map(item => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{item.lensProduct?.name || `Item #${item.id}`}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          Qty: {item.quantity} | {item.location?.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.inventoryItemId && (
                <p className="text-sm text-red-500 mt-1">{errors.inventoryItemId}</p>
              )}
            </div>

            {/* Selected Item Details */}
            {selectedItem && (
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="font-medium text-gray-900 mb-2">Selected Item Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Product:</span>
                    <span className="ml-2">{selectedItem.lensProduct?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Location:</span>
                    <span className="ml-2">{selectedItem.location?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Available:</span>
                    <span className="ml-2">{selectedItem.quantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Cost:</span>
                    <span className="ml-2">₹{selectedItem.costPrice}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Location Details */}
      {(isTransferTransaction || isInwardTransaction) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ArrowRight className="h-5 w-5" />
              <span>Location Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* From Location (for transfers) */}
              {isTransferTransaction && (
                <div>
                  <Label htmlFor="fromLocationId">
                    From Location <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.fromLocationId?.toString()}
                    onValueChange={(value) => handleChange('fromLocationId', parseInt(value))}
                  >
                    <SelectTrigger className={errors.fromLocationId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select source location" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdownData.locations?.map(location => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.fromLocationId && (
                    <p className="text-sm text-red-500 mt-1">{errors.fromLocationId}</p>
                  )}
                </div>
              )}

              {/* To Location */}
              <div>
                <Label htmlFor="toLocationId">
                  {isTransferTransaction ? 'To Location' : 'Location'} 
                  {(isTransferTransaction || isInwardTransaction) && <span className="text-red-500">*</span>}
                </Label>
                <Select
                  value={formData.toLocationId?.toString()}
                  onValueChange={(value) => handleChange('toLocationId', parseInt(value))}
                >
                  <SelectTrigger className={errors.toLocationId ? 'border-red-500' : ''}>
                    <SelectValue placeholder={isTransferTransaction ? "Select destination" : "Select location"} />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownData.locations?.map(location => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.toLocationId && (
                  <p className="text-sm text-red-500 mt-1">{errors.toLocationId}</p>
                )}
              </div>

              {/* From Tray (for transfers) */}
              {isTransferTransaction && (
                <div>
                  <Label htmlFor="fromTrayId">From Tray</Label>
                  <Select
                    value={formData.fromTrayId?.toString()}
                    onValueChange={(value) => handleChange('fromTrayId', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source tray" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdownData.trays?.map(tray => (
                        <SelectItem key={tray.id} value={tray.id.toString()}>
                          {tray.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* To Tray */}
              <div>
                <Label htmlFor="toTrayId">
                  {isTransferTransaction ? 'To Tray' : 'Tray'}
                </Label>
                <Select
                  value={formData.toTrayId?.toString()}
                  onValueChange={(value) => handleChange('toTrayId', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isTransferTransaction ? "Select destination tray" : "Select tray"} />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownData.trays?.map(tray => (
                      <SelectItem key={tray.id} value={tray.id.toString()}>
                        {tray.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reference Details */}
      <Card>
        <CardHeader>
          <CardTitle>Reference Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purchase Order (for PO inward) */}
            {formData.type === 'INWARD_PO' && (
              <div>
                <Label htmlFor="purchaseOrderId">
                  Purchase Order <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.purchaseOrderId?.toString()}
                  onValueChange={(value) => handleChange('purchaseOrderId', parseInt(value))}
                >
                  <SelectTrigger className={errors.purchaseOrderId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select purchase order" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownData.purchaseOrders?.map(po => (
                      <SelectItem key={po.id} value={po.id.toString()}>
                        {po.orderNumber} - {po.vendor?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.purchaseOrderId && (
                  <p className="text-sm text-red-500 mt-1">{errors.purchaseOrderId}</p>
                )}
              </div>
            )}

            {/* Sale Order (for sale outward) */}
            {formData.type === 'OUTWARD_SALE' && (
              <div>
                <Label htmlFor="saleOrderId">
                  Sale Order <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.saleOrderId?.toString()}
                  onValueChange={(value) => handleChange('saleOrderId', parseInt(value))}
                >
                  <SelectTrigger className={errors.saleOrderId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select sale order" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownData.saleOrders?.map(so => (
                      <SelectItem key={so.id} value={so.id.toString()}>
                        {so.orderNumber} - {so.customer?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.saleOrderId && (
                  <p className="text-sm text-red-500 mt-1">{errors.saleOrderId}</p>
                )}
              </div>
            )}

            {/* Vendor (for inward transactions) */}
            {['INWARD_DIRECT', 'INWARD_PO'].includes(formData.type) && (
              <div>
                <Label htmlFor="vendorId">Vendor</Label>
                <Select
                  value={formData.vendorId?.toString()}
                  onValueChange={(value) => handleChange('vendorId', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownData.vendors?.map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Unit Price */}
            <div>
              <Label htmlFor="unitPrice">Unit Price</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.unitPrice || ''}
                onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || null)}
                placeholder="Enter unit price"
              />
            </div>

            {/* Batch Number */}
            <div>
              <Label htmlFor="batchNo">Batch Number</Label>
              <Input
                id="batchNo"
                value={formData.batchNo}
                onChange={(e) => handleChange('batchNo', e.target.value)}
                placeholder="Enter batch number"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Enter transaction reason"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Enter any additional notes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? 'Creating...' : 'Create Transaction'}</span>
        </Button>
      </div>
    </form>
  );
};

export default InventoryTransactionForm;