import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Package, 
  MapPin, 
  Calendar,
  DollarSign,
  MoreVertical,
  Info
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getStatusColor,
  formatCurrency,
  formatDate,
  formatDateTime,
} from './Inventory.constants';

const InventoryCard = ({ 
  item, 
  onEdit, 
  onDelete, 
  onView,
  detailed = false 
}) => {
  const handleEdit = () => {
    if (onEdit) onEdit(item);
  };

  const handleDelete = () => {
    if (onDelete) onDelete(item.id);
  };

  const handleView = () => {
    if (onView) onView(item);
  };

  const renderEyeSpecs = () => {
    const hasRightSpecs = item.rightSpherical || item.rightCylindrical || item.rightAxis || item.rightAdd;
    const hasLeftSpecs = item.leftSpherical || item.leftCylindrical || item.leftAxis || item.leftAdd;
    
    if (!hasRightSpecs && !hasLeftSpecs) return null;

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Eye Specifications</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Right Eye */}
          {item.rightEye && hasRightSpecs && (
            <div>
              <p className="font-medium text-gray-600 mb-2">Right Eye</p>
              <div className="space-y-1 text-xs">
                {item.rightSpherical && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Spherical:</span>
                    <span>{item.rightSpherical}</span>
                  </div>
                )}
                {item.rightCylindrical && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cylindrical:</span>
                    <span>{item.rightCylindrical}</span>
                  </div>
                )}
                {item.rightAxis && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Axis:</span>
                    <span>{item.rightAxis}</span>
                  </div>
                )}
                {item.rightAdd && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Add:</span>
                    <span>{item.rightAdd}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Left Eye */}
          {item.leftEye && hasLeftSpecs && (
            <div>
              <p className="font-medium text-gray-600 mb-2">Left Eye</p>
              <div className="space-y-1 text-xs">
                {item.leftSpherical && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Spherical:</span>
                    <span>{item.leftSpherical}</span>
                  </div>
                )}
                {item.leftCylindrical && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cylindrical:</span>
                    <span>{item.leftCylindrical}</span>
                  </div>
                )}
                {item.leftAxis && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Axis:</span>
                    <span>{item.leftAxis}</span>
                  </div>
                )}
                {item.leftAdd && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Add:</span>
                    <span>{item.leftAdd}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (detailed) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {item.lensProduct?.name || 'Unknown Product'}
            </h3>
            <p className="text-sm text-gray-500">ID: {item.id}</p>
          </div>
          <Badge className={getStatusColor(item.status)}>
            {item.status}
          </Badge>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Product Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Lens Product:</span>
                <span>{item.lensProduct?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Category:</span>
                <span>{item.category?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span>{item.type?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Coating:</span>
                <span>{item.coating?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Diameter:</span>
                <span>{item.diameter?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fitting:</span>
                <span>{item.fitting?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tinting:</span>
                <span>{item.tinting?.name || '-'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Inventory Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span>{item.location?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tray:</span>
                <span>{item.tray?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Quantity:</span>
                <span className="font-medium">{item.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cost Price:</span>
                <span className="font-medium">{formatCurrency(item.costPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Selling Price:</span>
                <span className="font-medium">{formatCurrency(item.sellingPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Quality Grade:</span>
                <span>{item.qualityGrade || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Eye Selection */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Eye Selection</h4>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Right Eye:</span>
              <Badge variant={item.rightEye ? 'default' : 'secondary'}>
                {item.rightEye ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Left Eye:</span>
              <Badge variant={item.leftEye ? 'default' : 'secondary'}>
                {item.leftEye ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Eye Specifications */}
        {renderEyeSpecs()}

        {/* Additional Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Additional Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Batch No:</span>
                <span>{item.batchNo || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Serial No:</span>
                <span>{item.serialNo || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vendor:</span>
                <span>{item.vendor?.name || '-'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Manufacture Date:</span>
                <span>{formatDate(item.manufactureDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expiry Date:</span>
                <span>{formatDate(item.expiryDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Inward Date:</span>
                <span>{formatDate(item.inwardDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {item.notes && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Notes</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              {item.notes}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t">
          {onEdit && (
            <Button variant="outline" onClick={handleEdit} className="flex items-center space-x-2">
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="outline" 
              onClick={handleDelete}
              className="flex items-center space-x-2 text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-900 line-clamp-1">
              {item.lensProduct?.name || 'Unknown Product'}
            </h3>
            <p className="text-sm text-gray-500">ID: {item.id}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(item.status)}>
              {item.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={handleView}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Item
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Item
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Product Information */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Category:</span>
            <span>{item.category?.name || '-'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Type:</span>
            <span>{item.type?.name || '-'}</span>
          </div>
        </div>

        <Separator />

        {/* Location and Quantity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-gray-500">
              <MapPin className="h-3 w-3" />
              <span>Location:</span>
            </div>
            <span>{item.location?.name || '-'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-gray-500">
              <Package className="h-3 w-3" />
              <span>Quantity:</span>
            </div>
            <span className="font-medium">{item.quantity}</span>
          </div>
          {item.tray && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Tray:</span>
              <span>{item.tray.name}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Pricing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-gray-500">
              <DollarSign className="h-3 w-3" />
              <span>Cost:</span>
            </div>
            <span className="font-medium">{formatCurrency(item.costPrice)}</span>
          </div>
          {item.sellingPrice && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Selling:</span>
              <span className="font-medium">{formatCurrency(item.sellingPrice)}</span>
            </div>
          )}
        </div>

        {/* Eye Selection */}
        {(item.rightEye || item.leftEye) && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Eye:</span>
              <div className="flex items-center space-x-1">
                {item.rightEye && (
                  <Badge variant="outline" className="text-xs">R</Badge>
                )}
                {item.leftEye && (
                  <Badge variant="outline" className="text-xs">L</Badge>
                )}
              </div>
            </div>
          </>
        )}

        {/* Dates */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>Inward:</span>
            </div>
            <span>{formatDate(item.inwardDate)}</span>
          </div>
          {item.expiryDate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Expiry:</span>
              <span className={
                new Date(item.expiryDate) < new Date() 
                  ? 'text-red-600 font-medium' 
                  : ''
              }>
                {formatDate(item.expiryDate)}
              </span>
            </div>
          )}
        </div>

        {/* Additional Info */}
        {(item.batchNo || item.serialNo) && (
          <>
            <Separator />
            <div className="space-y-1">
              {item.batchNo && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Batch:</span>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {item.batchNo}
                  </span>
                </div>
              )}
              {item.serialNo && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Serial:</span>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {item.serialNo}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryCard;