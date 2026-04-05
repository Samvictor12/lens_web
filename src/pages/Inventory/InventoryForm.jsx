import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Eye, Package } from 'lucide-react';
import { FormInput } from '@/components/ui/form-input';
import { FormSelect } from '@/components/ui/form-select';
import { FormTextarea } from '@/components/ui/form-textarea';
import {
  defaultInventoryItem,
  inventoryStatusOptions,
  qualityGradeOptions,
  inventoryValidationRules,
} from './Inventory.constants';

const InventoryForm = ({ 
  initialData = null, 
  dropdownData = {}, 
  onSubmit,
}) => {
  const [formData, setFormData] = useState(defaultInventoryItem);
  const [errors, setErrors] = useState({});

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
    setFormData(prev => ({ ...prev, [field]: Boolean(checked) }));
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

    try {
      const submitData = {
        ...formData,
        expiryDate: formData.expiryDate ? formData.expiryDate.toISOString() : null,
        manufactureDate: formData.manufactureDate ? formData.manufactureDate.toISOString() : null,
      };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const lensOptions = useMemo(
    () => (dropdownData.lensProducts || []).map((lens) => ({ value: lens.id, label: lens.name })),
    [dropdownData.lensProducts]
  );

  const categoryOptions = useMemo(
    () => (dropdownData.categories || []).map((category) => ({ value: category.id, label: category.name })),
    [dropdownData.categories]
  );

  const typeOptions = useMemo(
    () => (dropdownData.types || []).map((type) => ({ value: type.id, label: type.name })),
    [dropdownData.types]
  );

  const coatingOptions = useMemo(
    () => (dropdownData.coatings || []).map((coating) => ({ value: coating.id, label: coating.name })),
    [dropdownData.coatings]
  );

  const locationOptions = useMemo(
    () => (dropdownData.locations || []).map((location) => ({ value: location.id, label: location.name })),
    [dropdownData.locations]
  );

  const trayOptions = useMemo(
    () => (dropdownData.trays || []).map((tray) => ({ value: tray.id, label: tray.name })),
    [dropdownData.trays]
  );

  const vendorOptions = useMemo(
    () => (dropdownData.vendors || []).map((vendor) => ({ value: vendor.id, label: vendor.name })),
    [dropdownData.vendors]
  );

  const statusOptions = useMemo(
    () => inventoryStatusOptions.map((status) => ({ value: status.value, label: status.label })),
    []
  );

  const qualityOptions = useMemo(
    () => qualityGradeOptions.map((grade) => ({ value: grade.value, label: grade.label })),
    []
  );

  const renderDateField = (field, label, error) => (
    <div className="space-y-1.5">
      <p className="text-xs">{label}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-8 w-full justify-start text-left text-sm font-normal',
              !formData[field] && 'text-muted-foreground',
              error && 'border-destructive'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formData[field] ? format(formData[field], 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={formData[field]}
            onSelect={(date) => handleDateChange(field, date)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );

  const renderEyeSpecFields = (prefix, title) => (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-3">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormInput
          label="Spherical"
          name={`${prefix}Spherical`}
          value={formData[`${prefix}Spherical`]}
          onChange={(e) => handleChange(`${prefix}Spherical`, e.target.value)}
          placeholder="e.g., -2.50"
        />
        <FormInput
          label="Cylindrical"
          name={`${prefix}Cylindrical`}
          value={formData[`${prefix}Cylindrical`]}
          onChange={(e) => handleChange(`${prefix}Cylindrical`, e.target.value)}
          placeholder="e.g., -1.00"
        />
        <FormInput
          label="Axis"
          name={`${prefix}Axis`}
          value={formData[`${prefix}Axis`]}
          onChange={(e) => handleChange(`${prefix}Axis`, e.target.value)}
          placeholder="e.g., 90"
        />
        <FormInput
          label="Add"
          name={`${prefix}Add`}
          value={formData[`${prefix}Add`]}
          onChange={(e) => handleChange(`${prefix}Add`, e.target.value)}
          placeholder="e.g., +2.00"
        />
      </div>
    </div>
  );

  return (
    <form id="inventory-item-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Item Basics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-4">
          <Alert className="bg-primary/5 border-primary/20">
            <AlertDescription className="text-xs">
              Use the shared dropdowns and compact card layout to capture the lens configuration first, then complete stock, pricing, and eye-specific details below.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect
              label="Lens Product"
              name="lens_id"
              options={lensOptions}
              value={formData.lens_id}
              onChange={(value) => handleChange('lens_id', value ? parseInt(value) : null)}
              placeholder="Select lens product"
              required
              error={errors.lens_id}
            />
            <FormSelect
              label="Category"
              name="category_id"
              options={categoryOptions}
              value={formData.category_id}
              onChange={(value) => handleChange('category_id', value ? parseInt(value) : null)}
              placeholder="Select category"
              isClearable
            />
            <FormSelect
              label="Type"
              name="Type_id"
              options={typeOptions}
              value={formData.Type_id}
              onChange={(value) => handleChange('Type_id', value ? parseInt(value) : null)}
              placeholder="Select type"
              isClearable
            />
            <FormSelect
              label="Coating"
              name="coating_id"
              options={coatingOptions}
              value={formData.coating_id}
              onChange={(value) => handleChange('coating_id', value ? parseInt(value) : null)}
              placeholder="Select coating"
              isClearable
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Stock & Pricing</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect
              label="Location"
              name="location_id"
              options={locationOptions}
              value={formData.location_id}
              onChange={(value) => handleChange('location_id', value ? parseInt(value) : null)}
              placeholder="Select location"
              isClearable
            />
            <FormSelect
              label="Tray"
              name="tray_id"
              options={trayOptions}
              value={formData.tray_id}
              onChange={(value) => handleChange('tray_id', value ? parseInt(value) : null)}
              placeholder="Select tray"
              isClearable
            />
            <FormInput
              label="Quantity"
              name="quantity"
              type="number"
              step="0.1"
              min="0"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
              required
              error={errors.quantity}
            />
            <FormSelect
              label="Status"
              name="status"
              options={statusOptions}
              value={formData.status}
              onChange={(value) => handleChange('status', value)}
              placeholder="Select status"
              isSearchable={false}
              isClearable={false}
            />
            <FormInput
              label="Cost Price"
              name="costPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.costPrice}
              onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
              required
              error={errors.costPrice}
              prefix="INR"
            />
            <FormInput
              label="Selling Price"
              name="sellingPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.sellingPrice ?? ''}
              onChange={(e) => handleChange('sellingPrice', e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
              error={errors.sellingPrice}
              prefix="INR"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Eye Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border/60 bg-muted/10 p-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rightEye"
                checked={formData.rightEye}
                onCheckedChange={(checked) => handleCheckboxChange('rightEye', checked)}
              />
              <label htmlFor="rightEye" className="text-sm">Right Eye</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="leftEye"
                checked={formData.leftEye}
                onCheckedChange={(checked) => handleCheckboxChange('leftEye', checked)}
              />
              <label htmlFor="leftEye" className="text-sm">Left Eye</label>
            </div>
          </div>
          
          {errors.eyeSelection && (
            <p className="text-xs text-destructive">{errors.eyeSelection}</p>
          )}
          {(formData.rightEye || formData.leftEye) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {formData.rightEye && renderEyeSpecFields('right', 'Right Eye')}
              {formData.leftEye && renderEyeSpecFields('left', 'Left Eye')}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Batch & Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormInput
              label="Batch Number"
              name="batchNo"
              value={formData.batchNo}
              onChange={(e) => handleChange('batchNo', e.target.value)}
              placeholder="Enter batch number"
            />
            <FormInput
              label="Serial Number"
              name="serialNo"
              value={formData.serialNo}
              onChange={(e) => handleChange('serialNo', e.target.value)}
              placeholder="Enter serial number"
            />
            <FormSelect
              label="Quality Grade"
              name="qualityGrade"
              options={qualityOptions}
              value={formData.qualityGrade}
              onChange={(value) => handleChange('qualityGrade', value)}
              placeholder="Select quality grade"
              isSearchable={false}
              isClearable={false}
            />
            <FormSelect
              label="Vendor"
              name="vendorId"
              options={vendorOptions}
              value={formData.vendorId}
              onChange={(value) => handleChange('vendorId', value ? parseInt(value) : null)}
              placeholder="Select vendor"
              isClearable
            />
            {renderDateField('manufactureDate', 'Manufacture Date')}
            {renderDateField('expiryDate', 'Expiry Date', errors.expiryDate)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Notes</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <FormTextarea
            label="Additional Notes"
            name="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Enter any additional notes..."
            rows={4}
          />
        </CardContent>
      </Card>
    </form>
  );
};

export default InventoryForm;