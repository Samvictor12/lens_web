import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import InventoryTransactionForm from './InventoryTransactionForm';
import { createInventoryTransaction, getInventoryDropdowns } from '@/services/inventory';

export default function InventoryTransactionPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dropdownData, setDropdownData] = useState({});

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        setIsLoading(true);
        const response = await getInventoryDropdowns();
        if (!response.success) {
          throw new Error(response.message || 'Failed to load dropdown data');
        }
        setDropdownData(response.data || {});
      } catch (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load dropdown data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDropdowns();
  }, [toast]);

  const handleSubmit = async (formData) => {
    try {
      setIsSaving(true);
      const response = await createInventoryTransaction(formData);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create transaction');
      }

      toast({ title: 'Success', description: 'Transaction created successfully' });
      navigate('/inventory/transactions');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading transaction form...</p>
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
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            New Inventory Transaction
          </h1>
          <p className="text-xs text-muted-foreground">
            Record an inventory inward, outward, transfer, or adjustment transaction
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-8 gap-1.5"
            onClick={() => navigate('/inventory/transactions')}
            disabled={isSaving}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <Button
            type="submit"
            form="inventory-transaction-form"
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
                Create Transaction
              </>
            )}
          </Button>
        </div>
      </div>

      <InventoryTransactionForm
        dropdownData={dropdownData}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
