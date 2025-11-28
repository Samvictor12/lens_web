import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Eye, Save, X } from 'lucide-react';
import {
  defaultInventoryItem,
  inventoryStatusOptions,
  qualityGradeOptions,
  eyeSpecFields,
  inventoryValidationRules,
} from './Inventory.constants';

const InventoryForm = ({ 
  initialData = null, 
  dropdownData = {}, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState(defaultInventoryItem);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultInventoryItem,
        ...initialData,
        expiryDate: initialData.expiryDate ? new Date(initialData.expiryDate) : null,
        manufactureDate: initialData.manufactureDate ? new Date(initialData.manufactureDate) : null,
      });
    } else {
      setFormData(defaultInventoryItem);
    }
  }, [initialData]);

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle checkbox changes
  const handleCheckboxChange = (field, checked) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  // Handle date changes
  const handleDateChange = (field, date) => {
    setFormData(prev => ({ ...prev, [field]: date }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    Object.keys(inventoryValidationRules).forEach(field => {
      const rule = inventoryValidationRules[field];
      const value = formData[field];

      if (rule.required && (!value || value === '')) {
        newErrors[field] = rule.message;
      } else if (rule.min !== undefined && value < rule.min) {
        newErrors[field] = rule.message;
      }
    });

    // Custom validations
    if (!formData.rightEye && !formData.leftEye) {
      newErrors.eyeSelection = 'Please select at least one eye (Right or Left)';
    }

    if (formData.sellingPrice && formData.sellingPrice < formData.costPrice) {
      newErrors.sellingPrice = 'Selling price cannot be less than cost price';
    }

    if (formData.expiryDate && formData.manufactureDate && formData.expiryDate <= formData.manufactureDate) {
      newErrors.expiryDate = 'Expiry date must be after manufacture date';
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
      // Prepare data for submission
      const submitData = {
        ...formData,
        expiryDate: formData.expiryDate ? formData.expiryDate.toISOString() : null,
        manufactureDate: formData.manufactureDate ? formData.manufactureDate.toISOString() : null,
      };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Basic Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lens Product */}
            <div>
              <Label htmlFor="lens_id">
                Lens Product <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.lens_id?.toString()}
                onValueChange={(value) => handleChange('lens_id', parseInt(value))}
              >
                <SelectTrigger className={errors.lens_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select lens product" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownData.lensProducts?.map(lens => (
                    <SelectItem key={lens.id} value={lens.id.toString()}>
                      {lens.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.lens_id && (
                <p className="text-sm text-red-500 mt-1">{errors.lens_id}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category_id">Category</Label>
              <Select
                value={formData.category_id?.toString()}
                onValueChange={(value) => handleChange('category_id', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownData.categories?.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div>
              <Label htmlFor="Type_id">Type</Label>
              <Select
                value={formData.Type_id?.toString()}
                onValueChange={(value) => handleChange('Type_id', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownData.types?.map(type => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Coating */}
            <div>
              <Label htmlFor="coating_id">Coating</Label>
              <Select
                value={formData.coating_id?.toString()}
                onValueChange={(value) => handleChange('coating_id', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select coating" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownData.coatings?.map(coating => (
                    <SelectItem key={coating.id} value={coating.id.toString()}>
                      {coating.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location and Inventory Details */}
      <Card>
        <CardHeader>
          <CardTitle>Location & Inventory Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location */}
            <div>
              <Label htmlFor="location_id">Location</Label>
              <Select
                value={formData.location_id?.toString()}
                onValueChange={(value) => handleChange('location_id', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownData.locations?.map(location => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tray */}
            <div>
              <Label htmlFor="tray_id">Tray</Label>
              <Select
                value={formData.tray_id?.toString()}
                onValueChange={(value) => handleChange('tray_id', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tray" />
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

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">
                Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                min="0"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
                className={errors.quantity ? 'border-red-500' : ''}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryStatusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cost Price */}
            <div>
              <Label htmlFor="costPrice">
                Cost Price <span className="text-red-500">*</span>
              </Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
                className={errors.costPrice ? 'border-red-500' : ''}
              />
              {errors.costPrice && (
                <p className="text-sm text-red-500 mt-1">{errors.costPrice}</p>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.sellingPrice || ''}
                onChange={(e) => handleChange('sellingPrice', parseFloat(e.target.value) || null)}
                className={errors.sellingPrice ? 'border-red-500' : ''}
              />
              {errors.sellingPrice && (
                <p className="text-sm text-red-500 mt-1">{errors.sellingPrice}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eye Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Eye Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rightEye"
                checked={formData.rightEye}
                onCheckedChange={(checked) => handleCheckboxChange('rightEye', checked)}
              />
              <Label htmlFor="rightEye">Right Eye</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="leftEye"
                checked={formData.leftEye}
                onCheckedChange={(checked) => handleCheckboxChange('leftEye', checked)}
              />
              <Label htmlFor="leftEye">Left Eye</Label>
            </div>
          </div>
          
          {errors.eyeSelection && (
            <p className="text-sm text-red-500">{errors.eyeSelection}</p>
          )}
        </CardContent>
      </Card>

      {/* Eye Specifications */}
      {(formData.rightEye || formData.leftEye) && (
        <Card>
          <CardHeader>
            <CardTitle>Eye Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Right Eye Specs */}
              {formData.rightEye && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Right Eye</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="rightSpherical">Spherical</Label>
                      <Input
                        id="rightSpherical"
                        value={formData.rightSpherical}
                        onChange={(e) => handleChange('rightSpherical', e.target.value)}
                        placeholder="e.g., -2.50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rightCylindrical">Cylindrical</Label>
                      <Input
                        id="rightCylindrical"
                        value={formData.rightCylindrical}
                        onChange={(e) => handleChange('rightCylindrical', e.target.value)}
                        placeholder="e.g., -1.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rightAxis">Axis</Label>
                      <Input
                        id="rightAxis"
                        value={formData.rightAxis}
                        onChange={(e) => handleChange('rightAxis', e.target.value)}
                        placeholder="e.g., 90"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rightAdd">Add</Label>
                      <Input
                        id="rightAdd"
                        value={formData.rightAdd}
                        onChange={(e) => handleChange('rightAdd', e.target.value)}
                        placeholder="e.g., +2.00"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Left Eye Specs */}
              {formData.leftEye && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Left Eye</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="leftSpherical">Spherical</Label>
                      <Input
                        id="leftSpherical"
                        value={formData.leftSpherical}
                        onChange={(e) => handleChange('leftSpherical', e.target.value)}
                        placeholder="e.g., -2.50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="leftCylindrical">Cylindrical</Label>
                      <Input
                        id="leftCylindrical"
                        value={formData.leftCylindrical}
                        onChange={(e) => handleChange('leftCylindrical', e.target.value)}
                        placeholder="e.g., -1.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="leftAxis">Axis</Label>
                      <Input
                        id="leftAxis"
                        value={formData.leftAxis}
                        onChange={(e) => handleChange('leftAxis', e.target.value)}
                        placeholder="e.g., 90"
                      />
                    </div>
                    <div>
                      <Label htmlFor="leftAdd">Add</Label>
                      <Input
                        id="leftAdd"
                        value={formData.leftAdd}
                        onChange={(e) => handleChange('leftAdd', e.target.value)}
                        placeholder="e.g., +2.00"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Serial Number */}
            <div>
              <Label htmlFor="serialNo">Serial Number</Label>
              <Input
                id="serialNo"
                value={formData.serialNo}
                onChange={(e) => handleChange('serialNo', e.target.value)}
                placeholder="Enter serial number"
              />
            </div>

            {/* Quality Grade */}
            <div>
              <Label htmlFor="qualityGrade">Quality Grade</Label>
              <Select
                value={formData.qualityGrade}
                onValueChange={(value) => handleChange('qualityGrade', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quality grade" />
                </SelectTrigger>
                <SelectContent>
                  {qualityGradeOptions.map(grade => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vendor */}
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

            {/* Manufacture Date */}
            <div>
              <Label>Manufacture Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.manufactureDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.manufactureDate ? (
                      format(formData.manufactureDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.manufactureDate}
                    onSelect={(date) => handleDateChange('manufactureDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Expiry Date */}
            <div>
              <Label>Expiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expiryDate && "text-muted-foreground",
                      errors.expiryDate && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expiryDate ? (
                      format(formData.expiryDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expiryDate}
                    onSelect={(date) => handleDateChange('expiryDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.expiryDate && (
                <p className="text-sm text-red-500 mt-1">{errors.expiryDate}</p>
              )}
            </div>
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
          <span>{loading ? 'Saving...' : (initialData ? 'Update Item' : 'Save Item')}</span>
        </Button>
      </div>
    </form>
  );
};

export default InventoryForm;