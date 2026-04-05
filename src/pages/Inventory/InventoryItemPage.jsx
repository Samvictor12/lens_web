import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Package, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import InventoryForm from './InventoryForm';
import InventoryCard from './InventoryCard';
import {
  createInventoryItem,
  getInventoryDropdowns,
  getInventoryItemById,
  updateInventoryItem,
} from '@/services/inventory';

export default function InventoryItemPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const mode = useMemo(() => {
    if (location.pathname.includes('/edit/')) return 'edit';
    if (location.pathname.includes('/view/')) return 'view';
    return 'add';
  }, [location.pathname]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dropdownData, setDropdownData] = useState({});
  const [inventoryItem, setInventoryItem] = useState(null);

  useEffect(() => {
    const loadPage = async () => {
      try {
        setIsLoading(true);
        const [dropdownsRes, itemRes] = await Promise.all([
          getInventoryDropdowns(),
          id ? getInventoryItemById(parseInt(id)) : Promise.resolve({ success: true, data: null }),
        ]);

        if (!dropdownsRes.success) {
          throw new Error(dropdownsRes.message || 'Failed to load dropdown data');
        }

        setDropdownData(dropdownsRes.data || {});

        if (id) {
          if (!itemRes.success) {
            throw new Error(itemRes.message || 'Failed to load inventory item');
          }
          setInventoryItem(itemRes.data || null);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load page',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
  }, [id, toast]);

  const handleSubmit = async (formData) => {
    try {
      setIsSaving(true);
      const response = mode === 'edit'
        ? await updateInventoryItem(parseInt(id), formData)
        : await createInventoryItem(formData);

      if (!response.success) {
        throw new Error(response.message || 'Failed to save inventory item');
      }

      toast({
        title: 'Success',
        description: mode === 'edit' ? 'Inventory item updated successfully' : 'Inventory item created successfully',
      });
      navigate('/inventory/items');
    } finally {
      setIsSaving(false);
    }
  };

  const title = mode === 'edit'
    ? 'Edit Inventory Item'
    : mode === 'view'
      ? 'Inventory Item Details'
      : 'Add New Inventory Item';

  if (isLoading) {
    return (
      <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading inventory item form...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === 'view' ? 'Review inventory item details' : 'Capture lens, stock, pricing, and specification details for this inventory item'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            className="h-8 gap-1.5"
            onClick={() => navigate(mode === 'edit' && id ? `/inventory/items/view/${id}` : '/inventory/items')}
            disabled={isSaving}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          {mode === 'view' && inventoryItem && (
            <Button size="xs" className="h-8 gap-1.5" onClick={() => navigate(`/inventory/items/edit/${inventoryItem.id}`)}>
              <Edit className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
          {mode !== 'view' && (
            <Button
              type="submit"
              form="inventory-item-form"
              size="xs"
              className="h-8 gap-1.5"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {mode === 'edit' ? 'Update Item' : 'Save Item'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {mode === 'view' ? (
        <Card>
          <CardContent className="p-4">
            {inventoryItem && <InventoryCard item={inventoryItem} detailed={true} />}
          </CardContent>
        </Card>
      ) : (
        <InventoryForm
          initialData={inventoryItem}
          dropdownData={dropdownData}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
