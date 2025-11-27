import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getCustomerMinimal, getLensProductsWithPrices, getCustomerPriceMappings, bulkUpsertPriceMappings } from "@/services/priceMapping";

// Helper function to group products by type and organize coating data
const groupProductsByType = (products) => {
  // First, collect all unique coatings across all products
  const allCoatingsMap = new Map();
  products.forEach(product => {
    product.prices.forEach(priceEntry => {
      if (!allCoatingsMap.has(priceEntry.coating.id)) {
        allCoatingsMap.set(priceEntry.coating.id, priceEntry.coating);
      }
    });
  });
  
  const allCoatings = Array.from(allCoatingsMap.values()).sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Then group by lens type (for now we'll use a placeholder approach)
  // Since the API doesn't return type info, we'll group by brand as a workaround
  const grouped = new Map();
  
  products.forEach(product => {
    const groupKey = product.brand; // Using brand as proxy for type
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        type_name: groupKey,
        type_id: groupKey,
        coatings: allCoatings,
        products: []
      });
    }
    
    // Transform prices array to object keyed by coating_id
    const pricesMap = {};
    product.prices.forEach(priceEntry => {
      pricesMap[priceEntry.coating.id] = priceEntry;
    });
    
    grouped.get(groupKey).products.push({
      ...product,
      pricesMap: pricesMap
    });
  });
  
  return Array.from(grouped.values());
};

export default function PriceMappingMain() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [groupedProducts, setGroupedProducts] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [priceMappings, setPriceMappings] = useState({});
  const [discountInputs, setDiscountInputs] = useState({});

  // Fetch customer and products data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch minimal customer details (id, code, name only)
        const customerResponse = await getCustomerMinimal(customerId);
        if (customerResponse.success) {
          setCustomer(customerResponse.data);
        }

        // Fetch all lens products with prices (paginated)
        let allProducts = [];
        let currentPage = 1;
        let hasMore = true;
        
        while (hasMore) {
          const productsResponse = await getLensProductsWithPrices({
            activeStatus: true,
            page: currentPage,
            limit: 100 // Max allowed by backend
          });

          if (productsResponse.success && productsResponse.data) {
            allProducts = [...allProducts, ...productsResponse.data];
            
            // Check if there are more pages
            const { page, pages } = productsResponse.pagination || {};
            hasMore = page < pages;
            currentPage++;
          } else {
            hasMore = false;
          }
        }

        // Group products by type
        const grouped = groupProductsByType(allProducts);
        setGroupedProducts(grouped);

        // Fetch existing price mappings for this customer
        try {
          const mappingsResponse = await getCustomerPriceMappings(customerId);
          if (mappingsResponse.success && mappingsResponse.data) {
            const mappingsMap = {};
            const discountsMap = {};
            
            const mappingsList = Array.isArray(mappingsResponse.data) 
              ? mappingsResponse.data 
              : [];
            
            mappingsList.forEach(mapping => {
              mappingsMap[mapping.lensPrice_id] = mapping;
              discountsMap[mapping.lensPrice_id] = mapping.discountRate;
            });
            
            setPriceMappings(mappingsMap);
            setDiscountInputs(discountsMap);
          }
        } catch (mappingError) {
          // It's okay if there are no mappings yet
          console.log("No existing price mappings found:", mappingError);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load price mapping data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId) {
      fetchData();
    }
  }, [customerId, toast]);

  // Toggle group expansion
  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Handle discount input change
  const handleDiscountChange = (lensPriceId, value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0 && numValue <= 100) {
      setDiscountInputs(prev => ({
        ...prev,
        [lensPriceId]: numValue
      }));
    }
  };

  // Set discount for all items in a group
  const handleGroupDiscountChange = (group, value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0 && numValue <= 100) {
      const newDiscounts = { ...discountInputs };
      group.products.forEach(product => {
        Object.values(product.pricesMap).forEach(priceEntry => {
          newDiscounts[priceEntry.id] = numValue;
        });
      });
      setDiscountInputs(newDiscounts);
    }
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (originalPrice, discountRate) => {
    const discount = (originalPrice * discountRate) / 100;
    return originalPrice - discount;
  };

  // Handle save all mappings
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Prepare mappings array
      const mappings = [];
      Object.keys(discountInputs).forEach(lensPriceId => {
        const discountRate = discountInputs[lensPriceId] || 0;
        if (discountRate > 0) {
          mappings.push({
            lensPrice_id: parseInt(lensPriceId),
            discountRate: discountRate
          });
        }
      });

      if (mappings.length === 0) {
        toast({
          title: "No Changes",
          description: "Please set at least one discount rate before saving",
          variant: "default",
        });
        return;
      }

      const response = await bulkUpsertPriceMappings(customerId, mappings);
      
      if (response.success) {
        toast({
          title: "Success",
          description: `Successfully saved ${mappings.length} price mapping(s)`,
        });
        
        // Refresh data
        try {
          const mappingsResponse = await getCustomerPriceMappings(customerId);
          if (mappingsResponse.success && mappingsResponse.data) {
            const mappingsMap = {};
            const mappingsList = Array.isArray(mappingsResponse.data) 
              ? mappingsResponse.data 
              : [];
            
            mappingsList.forEach(mapping => {
              mappingsMap[mapping.lensPrice_id] = mapping;
            });
            setPriceMappings(mappingsMap);
          }
        } catch (refreshError) {
          console.log("Could not refresh mappings:", refreshError);
        }
      }
    } catch (error) {
      console.error("Error saving price mappings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save price mappings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading price mapping...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Price Mapping
          </h1>
          {customer && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {customer.code} - {customer.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-8 gap-1.5"
            onClick={() => navigate("/sales/customers")}
            disabled={isSaving}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save All</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grouped Products */}
      <div className="flex-1 overflow-auto space-y-2">
        {groupedProducts.map((group) => {
          const groupKey = `type_${group.type_id}`;
          const isExpanded = expandedGroups[groupKey];

          return (
            <Card key={groupKey} className="overflow-hidden">
              <div
                className="p-3 cursor-pointer hover:bg-accent/30 transition-colors border-b"
                onClick={() => toggleGroup(groupKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-primary" />
                    )}
                    <h3 className="font-semibold text-sm">
                      {group.type_name}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({group.products.length} {group.products.length === 1 ? 'product' : 'products'})
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground">Apply to all:</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0"
                      className="w-20 h-7 text-xs"
                      onChange={(e) => handleGroupDiscountChange(group, e.target.value)}
                    />
                    <span className="text-xs">%</span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left font-medium">Product</th>
                        <th className="p-2 text-left font-medium">Code</th>
                        <th className="p-2 text-left font-medium">Index</th>
                        <th className="p-2 text-left font-medium">Power Range</th>
                        {group.coatings && group.coatings.map(coating => (
                          <th key={coating.id} className="p-2 text-center font-medium" colSpan="3">
                            {coating.short_name || coating.name}
                          </th>
                        ))}
                      </tr>
                      <tr className="bg-muted/30">
                        <th className="p-2"></th>
                        <th className="p-2"></th>
                        <th className="p-2"></th>
                        <th className="p-2"></th>
                        {group.coatings && group.coatings.map(coating => (
                          <React.Fragment key={`sub_${coating.id}`}>
                            <th className="p-1 text-center text-[10px] text-muted-foreground">Price</th>
                            <th className="p-1 text-center text-[10px] text-muted-foreground">Disc %</th>
                            <th className="p-1 text-center text-[10px] text-muted-foreground">Final</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.products.map((product) => (
                        <tr key={product.id} className="border-t hover:bg-muted/20">
                          <td className="p-2">{product.lens_name}</td>
                          <td className="p-2">{product.product_code}</td>
                          <td className="p-2">-</td>
                          <td className="p-2 text-[10px]">-</td>
                          {group.coatings.map((coating) => {
                            const priceEntry = product.pricesMap[coating.id];
                            if (!priceEntry) {
                              return (
                                <React.Fragment key={`empty_${coating.id}`}>
                                  <td className="p-1 text-center text-muted-foreground">-</td>
                                  <td className="p-1 text-center text-muted-foreground">-</td>
                                  <td className="p-1 text-center text-muted-foreground">-</td>
                                </React.Fragment>
                              );
                            }

                            const discountRate = discountInputs[priceEntry.id] || 0;
                            const discountedPrice = calculateDiscountedPrice(priceEntry.price, discountRate);
                            const hasMapping = priceMappings[priceEntry.id];

                            return (
                              <React.Fragment key={priceEntry.id}>
                                <td className="p-1 text-center">
                                  ₹{priceEntry.price.toLocaleString('en-IN')}
                                </td>
                                <td className="p-1 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={discountRate}
                                    onChange={(e) => handleDiscountChange(priceEntry.id, e.target.value)}
                                    className={`w-16 h-6 text-xs text-center ${hasMapping ? 'border-blue-500' : ''}`}
                                  />
                                </td>
                                <td className="p-1 text-center font-medium">
                                  ₹{discountedPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}

        {groupedProducts.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No lens products available</p>
          </Card>
        )}
      </div>
    </div>
  );
}
