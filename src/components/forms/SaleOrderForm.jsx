import React, { useState, useEffect } from "react";
import { Plus, Trash2, Search, Calculator, User, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { dummyCustomers, dummyLensTypes, dummyLensVariants } from "@/lib/dummyData";

const SaleOrderForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    status: "DRAFT",
    fittingType: "",
    notes: "",
    isNewCustomer: false,
  });

  const [orderItems, setOrderItems] = useState([
    {
      id: 1,
      lensVariantId: "",
      lensTypeId: "",
      quantity: 1,
      price: 0,
      discount: 0,
      subtotal: 0,
    }
  ]);

  const [totals, setTotals] = useState({
    subtotal: 0,
    totalDiscount: 0,
    totalAmount: 0,
    taxAmount: 0,
    finalAmount: 0,
  });

  const [searchCustomer, setSearchCustomer] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState(dummyCustomers);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [errors, setErrors] = useState({});

  // Customer search functionality
  useEffect(() => {
    if (searchCustomer && !formData.isNewCustomer) {
      const filtered = dummyCustomers.filter(customer =>
        customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        customer.phone?.includes(searchCustomer) ||
        customer.email?.toLowerCase().includes(searchCustomer.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(filtered.length > 0);
    } else {
      setFilteredCustomers(dummyCustomers);
      setShowCustomerDropdown(false);
    }
  }, [searchCustomer, formData.isNewCustomer]);

  // Calculate totals whenever items change
  useEffect(() => {
    const subtotal = orderItems.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity;
      const discountAmount = (itemSubtotal * item.discount) / 100;
      return sum + (itemSubtotal - discountAmount);
    }, 0);
    
    const totalDiscount = orderItems.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity;
      return sum + (itemSubtotal * item.discount) / 100;
    }, 0);
    
    const taxAmount = subtotal * 0.18; // 18% GST
    const finalAmount = subtotal + taxAmount;

    setTotals({
      subtotal,
      totalDiscount,
      totalAmount: subtotal,
      taxAmount,
      finalAmount,
    });
  }, [orderItems]);

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }

    if (formData.isNewCustomer && !formData.customerPhone.trim()) {
      newErrors.customerPhone = "Phone number is required for new customers";
    }

    if (orderItems.some(item => !item.lensVariantId)) {
      newErrors.items = "Please select lens variants for all items";
    }

    if (orderItems.every(item => !item.lensVariantId)) {
      newErrors.items = "At least one item is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    setFormData({
      ...formData,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      customerAddress: customer.address || "",
      isNewCustomer: false,
    });
    setSearchCustomer(customer.name);
    setShowCustomerDropdown(false);
    
    // Clear customer-related errors
    const newErrors = { ...errors };
    delete newErrors.customerName;
    delete newErrors.customerPhone;
    setErrors(newErrors);
  };

  // Handle new customer toggle
  const handleNewCustomerToggle = (checked) => {
    if (checked) {
      setFormData({
        ...formData,
        customerId: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        customerAddress: "",
        isNewCustomer: true,
      });
      setSearchCustomer("");
    } else {
      setFormData({
        ...formData,
        isNewCustomer: false,
      });
    }
    setShowCustomerDropdown(false);
    
    // Clear errors when toggling
    const newErrors = { ...errors };
    delete newErrors.customerName;
    delete newErrors.customerPhone;
    setErrors(newErrors);
  };

  // Handle lens variant selection and price update
  const handleLensVariantChange = (itemIndex, variantId) => {
    const variant = dummyLensVariants.find(v => v.id === parseInt(variantId));
    const updatedItems = [...orderItems];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      lensVariantId: variantId,
      lensTypeId: variant?.lensTypeId || "",
      price: variant?.price || 0,
      subtotal: (variant?.price || 0) * updatedItems[itemIndex].quantity,
    };
    setOrderItems(updatedItems);
    
    // Clear items error if variant is selected
    if (variantId) {
      const newErrors = { ...errors };
      delete newErrors.items;
      setErrors(newErrors);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (itemIndex, quantity) => {
    const updatedItems = [...orderItems];
    const item = updatedItems[itemIndex];
    const newQuantity = Math.max(1, parseInt(quantity) || 1);
    
    updatedItems[itemIndex] = {
      ...item,
      quantity: newQuantity,
      subtotal: item.price * newQuantity,
    };
    setOrderItems(updatedItems);
  };

  // Handle discount change
  const handleDiscountChange = (itemIndex, discount) => {
    const updatedItems = [...orderItems];
    const item = updatedItems[itemIndex];
    const newDiscount = Math.max(0, Math.min(100, parseFloat(discount) || 0));
    
    updatedItems[itemIndex] = {
      ...item,
      discount: newDiscount,
    };
    setOrderItems(updatedItems);
  };

  // Add new item row
  const addNewItem = () => {
    setOrderItems([
      ...orderItems,
      {
        id: orderItems.length + 1,
        lensVariantId: "",
        lensTypeId: "",
        quantity: 1,
        price: 0,
        discount: 0,
        subtotal: 0,
      }
    ]);
  };

  // Remove item row
  const removeItem = (itemIndex) => {
    if (orderItems.length > 1) {
      const updatedItems = orderItems.filter((_, index) => index !== itemIndex);
      setOrderItems(updatedItems);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const saleOrderData = {
      customer: formData.isNewCustomer ? {
        name: formData.customerName,
        phone: formData.customerPhone,
        email: formData.customerEmail,
        address: formData.customerAddress,
      } : { id: formData.customerId },
      isNewCustomer: formData.isNewCustomer,
      status: formData.status,
      fittingType: formData.fittingType || null,
      items: orderItems.filter(item => item.lensVariantId).map(item => ({
        lensVariantId: parseInt(item.lensVariantId),
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
      })),
      totals,
      notes: formData.notes,
    };

    onSubmit(saleOrderData);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Form Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">Create Sale Order</h2>
          <p className="text-muted-foreground mt-1">
            Enter customer and product details to create a new sale order
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create Order
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Customer Information
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="newCustomer"
                  checked={formData.isNewCustomer}
                  onCheckedChange={handleNewCustomerToggle}
                />
                <Label htmlFor="newCustomer" className="text-sm">New Customer</Label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!formData.isNewCustomer && (
              <div className="space-y-2">
                <Label htmlFor="customerSearch">Search Existing Customer</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customerSearch"
                    placeholder="Search by name, phone, or email..."
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    onFocus={() => setShowCustomerDropdown(filteredCustomers.length > 0)}
                    className="pl-10"
                  />
                  {showCustomerDropdown && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => handleCustomerSelect(customer)}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {customer.phone} • {customer.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => {
                    setFormData({ ...formData, customerName: e.target.value });
                    if (e.target.value.trim()) {
                      const newErrors = { ...errors };
                      delete newErrors.customerName;
                      setErrors(newErrors);
                    }
                  }}
                  className={errors.customerName ? "border-red-500" : ""}
                  readOnly={!formData.isNewCustomer && formData.customerId}
                />
                {errors.customerName && (
                  <p className="text-sm text-red-500 mt-1">{errors.customerName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone Number {formData.isNewCustomer ? "*" : ""}</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => {
                    setFormData({ ...formData, customerPhone: e.target.value });
                    if (e.target.value.trim()) {
                      const newErrors = { ...errors };
                      delete newErrors.customerPhone;
                      setErrors(newErrors);
                    }
                  }}
                  className={errors.customerPhone ? "border-red-500" : ""}
                  readOnly={!formData.isNewCustomer && formData.customerId}
                />
                {errors.customerPhone && (
                  <p className="text-sm text-red-500 mt-1">{errors.customerPhone}</p>
                )}
              </div>
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  readOnly={!formData.isNewCustomer && formData.customerId}
                />
              </div>
              <div>
                <Label htmlFor="fittingType">Fitting Type</Label>
                <Select
                  value={formData.fittingType}
                  onValueChange={(value) => setFormData({ ...formData, fittingType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fitting type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Free Fitting">Free Fitting</SelectItem>
                    <SelectItem value="Paid Fitting">Paid Fitting</SelectItem>
                    <SelectItem value="No Fitting">No Fitting Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="customerAddress">Address</Label>
              <Textarea
                id="customerAddress"
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                rows={2}
                readOnly={!formData.isNewCustomer && formData.customerId}
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Order Items
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addNewItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {errors.items && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{errors.items}</AlertDescription>
              </Alert>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lens Type</TableHead>
                  <TableHead>Lens Variant</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Discount %</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((item, index) => {
                  const selectedVariant = dummyLensVariants.find(v => v.id === parseInt(item.lensVariantId));
                  const lensType = selectedVariant ? dummyLensTypes.find(t => t.id === selectedVariant.lensTypeId) : null;
                  const itemSubtotal = item.price * item.quantity;
                  const discountAmount = (itemSubtotal * item.discount) / 100;
                  const finalSubtotal = itemSubtotal - discountAmount;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {lensType ? (
                          <Badge variant="outline">{lensType.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.lensVariantId}
                          onValueChange={(value) => handleLensVariantChange(index, value)}
                        >
                          <SelectTrigger className="w-56">
                            <SelectValue placeholder="Select lens variant" />
                          </SelectTrigger>
                          <SelectContent>
                            {dummyLensVariants.map((variant) => {
                              const type = dummyLensTypes.find(t => t.id === variant.lensTypeId);
                              return (
                                <SelectItem key={variant.id} value={variant.id.toString()}>
                                  <div>
                                    <div className="font-medium">{variant.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {type?.name} • ₹{variant.price.toLocaleString("en-IN")}
                                      {variant.isRx && <Badge variant="secondary" className="ml-2">RX</Badge>}
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, e.target.value)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">₹{item.price.toLocaleString("en-IN")}</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.discount}
                          onChange={(e) => handleDiscountChange(index, e.target.value)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-semibold">₹{finalSubtotal.toLocaleString("en-IN")}</span>
                          {item.discount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Was ₹{itemSubtotal.toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {orderItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">₹{totals.subtotal.toLocaleString("en-IN")}</span>
              </div>
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between">
                  <span>Total Discount:</span>
                  <span className="font-medium text-red-600">-₹{totals.totalDiscount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST (18%):</span>
                <span className="font-medium">₹{totals.taxAmount.toLocaleString("en-IN")}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Final Amount:</span>
                <span>₹{totals.finalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="mt-6">
              <Label htmlFor="notes">Order Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any special instructions, prescription details, or notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="min-w-32">
            Create Order
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SaleOrderForm;