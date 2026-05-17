import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getInventoryDropdowns, createInventoryItem } from "@/services/inventory";
import { getTraysByLocation } from "@/services/tray";

/**
 * Multi-step Inventory Initialization Form
 * Step 1: Select Location
 * Step 2: Select Tray
 * Step 3: Add Lens Items with Quantities
 */
export default function InventoryInitializationForm({ isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dropdown data
  const [locations, setLocations] = useState([]);
  const [lensProducts, setLensProducts] = useState([]);
  const [trays, setTrays] = useState([]);

  // Form state
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedTrayId, setSelectedTrayId] = useState("");
  const [items, setItems] = useState([{ lens_id: "", quantity: "", costPrice: "" }]);

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen]);

  const loadDropdownData = async () => {
    try {
      setIsLoading(true);
      const response = await getInventoryDropdowns();
      if (response.success) {
        const data = response.data || {};
        setLocations(data.locations || []);
        setLensProducts(data.lensProducts || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dropdown data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationChange = async (value) => {
    setSelectedLocationId(value ? String(value) : "");
    setSelectedTrayId("");
    setTrays([]);

    if (value) {
      try {
        const response = await getTraysByLocation(value);
        if (response.success) {
          setTrays(response.data || []);
        }
      } catch (error) {
        console.error("Failed to load trays:", error);
      }
    }
  };

  const handleAddItem = () => {
    setItems([...items, { lens_id: "", quantity: "", costPrice: "" }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const validateStep1 = () => {
    if (!selectedLocationId) {
      toast({
        title: "Error",
        description: "Please select a location",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!selectedTrayId) {
      toast({
        title: "Error",
        description: "Please select a tray",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (items.filter((item) => item.lens_id).length === 0) {
      toast({
        title: "Error",
        description: "Add at least one lens item",
        variant: "destructive",
      });
      return false;
    }

    for (const item of items) {
      if (item.lens_id && (!item.quantity || parseFloat(item.quantity) <= 0)) {
        toast({
          title: "Error",
          description: "All items must have a quantity greater than 0",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    try {
      setIsSaving(true);
      let successCount = 0;
      let failureCount = 0;

      for (const item of items) {
        if (!item.lens_id) continue;

        try {
          const response = await createInventoryItem({
            lens_id: parseInt(item.lens_id),
            location_id: parseInt(selectedLocationId),
            tray_id: parseInt(selectedTrayId),
            quantity: parseFloat(item.quantity),
            costPrice: item.costPrice ? parseFloat(item.costPrice) : 0,
            status: "AVAILABLE",
          });

          if (response.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          failureCount++;
          console.error("Failed to create item:", error);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `Created ${successCount} inventory item(s)${
            failureCount > 0 ? `. ${failureCount} failed` : ""
          }`,
        });

        // Reset form
        setStep(1);
        setSelectedLocationId("");
        setSelectedTrayId("");
        setItems([{ lens_id: "", quantity: "", costPrice: "" }]);
        onSuccess?.();
        onClose();
      } else {
        throw new Error("Failed to create any items");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create inventory items",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedLocation = locations.find(
    (l) => String(l.id) === selectedLocationId
  );
  const selectedTray = trays.find((t) => String(t.id) === selectedTrayId);
  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: loc.name,
  }));
  const trayOptions = trays.map((tray) => ({
    value: tray.id,
    label: tray.name,
  }));
  const lensOptions = lensProducts.map((lens) => ({
    value: lens.id,
    label: lens.lens_name,
  }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>Initialize Stock</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Step {step} of 3 · Add initial inventory to your trays
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step Indicator */}
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Location Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Location *</label>
                <div className="mt-2">
                  <FormSelect
                    name="location"
                    value={selectedLocationId || null}
                    onChange={handleLocationChange}
                    options={locationOptions}
                    placeholder="Choose a storage location..."
                    isSearchable={true}
                    isClearable={false}
                    isLoading={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Select where you want to store the inventory items
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Tray Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription className="text-sm">
                  Location:{" "}
                  <span className="font-semibold">{selectedLocation?.name}</span>
                </AlertDescription>
              </Alert>

              <div>
                <label className="text-sm font-medium">Select Tray *</label>
                <div className="mt-2">
                  <FormSelect
                    name="tray"
                    value={selectedTrayId || null}
                    onChange={(value) => setSelectedTrayId(value ? String(value) : "")}
                    options={trayOptions}
                    placeholder="Choose a tray..."
                    isSearchable={true}
                    isClearable={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Select the tray where items will be stored within this location
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Add Items */}
          {step === 3 && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription className="text-sm">
                  <div>
                    Location:{" "}
                    <span className="font-semibold">{selectedLocation?.name}</span>
                  </div>
                  <div>
                    Tray: <span className="font-semibold">{selectedTray?.name}</span>
                  </div>
                </AlertDescription>
              </Alert>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Lens Items</label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 h-7"
                    onClick={handleAddItem}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3 bg-muted/20">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No items added. Click "Add Item" to start.
                    </p>
                  ) : (
                    items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground">
                            Lens Product
                          </label>
                          <FormSelect
                            name={`lens_${index}`}
                            value={item.lens_id || null}
                            onChange={(value) =>
                              handleItemChange(
                                index,
                                "lens_id",
                                value ? String(value) : ""
                              )
                            }
                            options={lensOptions}
                            placeholder="Select lens..."
                            isClearable={false}
                          />
                        </div>

                        <div className="w-24">
                          <label className="text-xs text-muted-foreground">
                            Quantity
                          </label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, "quantity", e.target.value)
                            }
                            placeholder="Qty"
                            className="h-8 text-sm"
                          />
                        </div>

                        <div className="w-28">
                          <label className="text-xs text-muted-foreground">
                            Cost Price
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.costPrice}
                            onChange={(e) =>
                              handleItemChange(index, "costPrice", e.target.value)
                            }
                            placeholder="0.00"
                            className="h-8 text-sm"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Add lens products with quantities and cost prices. Leave cost
                  price empty if unknown.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>

            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSaving}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}

            {step < 3 ? (
              <Button onClick={handleNext} disabled={isSaving} className="gap-1">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSaving || items.filter((i) => i.lens_id).length === 0}
                className="gap-1"
              >
                {isSaving ? "Creating..." : "Create Items"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
