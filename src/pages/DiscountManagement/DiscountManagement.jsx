import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    ChevronRight,
    ChevronDown,
    Percent,
    Package,
    Layers,
    Search,
    Save,
    RotateCcw,
    AlertCircle,
    User,
    ChevronsDownUp,
    ChevronsUpDown,
    ArrowLeft,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/apiClient';
import { FormSelect } from '@/components/ui/form-select';

export default function DiscountManagement() {
    const { customerId: urlCustomerId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Check if in embedded mode (customer ID from URL)
    const isEmbeddedMode = !!urlCustomerId;

    // Customer selection
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerHasPriceMapping, setCustomerHasPriceMapping] = useState(false);

    // Hierarchical data structure
    const [brandsData, setBrandsData] = useState([]);

    // Expansion states
    const [expandedBrands, setExpandedBrands] = useState(new Set());
    const [expandedProducts, setExpandedProducts] = useState(new Set());
    const [isAllExpanded, setIsAllExpanded] = useState(false);

    // Discount changes tracking
    const [discountChanges, setDiscountChanges] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Store brand and product level discount values for display only
    const [brandDiscounts, setBrandDiscounts] = useState({});
    const [productDiscounts, setProductDiscounts] = useState({});

    // Fetch customers on mount (only in standalone mode)
    useEffect(() => {
        if (!isEmbeddedMode) {
            fetchCustomers();
        }
    }, [isEmbeddedMode]);

    // Load customer from URL in embedded mode
    useEffect(() => {
        if (isEmbeddedMode && urlCustomerId) {
            // Fetch the specific customer details
            const loadCustomerFromUrl = async () => {
                try {
                    const response = await apiClient('get', `/customer-master/${urlCustomerId}`);
                    if (response.success) {
                        setSelectedCustomer(response.data);
                    }
                } catch (error) {
                    console.error('Error fetching customer:', error);
                    toast({
                        title: 'Error',
                        description: 'Failed to load customer details',
                        variant: 'destructive',
                    });
                }
            };
            loadCustomerFromUrl();
        }
    }, [isEmbeddedMode, urlCustomerId, toast]);

    // Fetch hierarchical data when customer is selected
    useEffect(() => {
        if (selectedCustomer) {
            fetchDiscountData();
        }
    }, [selectedCustomer]);

    const fetchCustomers = async () => {
        try {
            const response = await apiClient('get', '/customer-master/dropdown');
            if (response.success) {
                setCustomers(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast({
                title: 'Error',
                description: 'Failed to load customers',
                variant: 'destructive',
            });
        }
    };

    const fetchDiscountData = async () => {
        if (!selectedCustomer) return;

        setLoading(true);
        try {
            const response = await apiClient('get', `/V1/lens-products/discount-hierarchy/${selectedCustomer.id}`);
            if (response.success) {
                console.log("Discount data fetched:", response.data);

                const brands = response.data.brands || [];
                setBrandsData(brands);
                setCustomerHasPriceMapping(response.data.hasPriceMapping || false);

                // If customer has custom pricing, populate discount states from existing data
                if (response.data.hasPriceMapping) {
                    const newBrandDiscounts = {};
                    const newProductDiscounts = {};
                    const newDiscountChanges = {};

                    brands.forEach(brand => {
                        brand.lensProductMasters?.forEach(product => {
                            product.lensPriceMasters?.forEach(priceData => {
                                // Check if this coating has a price mapping with discount rate
                                if (priceData.priceMappings && priceData.priceMappings.length > 0) {
                                    const mapping = priceData.priceMappings[0];
                                    const discountRate = mapping.discountRate || 0;

                                    if (discountRate > 0) {
                                        // Store the coating-level discount
                                        newDiscountChanges[`coating_${priceData.id}`] = {
                                            type: 'coating',
                                            brandId: brand.id,
                                            productId: product.id,
                                            coatingId: priceData.coating.id,
                                            priceId: priceData.id,
                                            discount: discountRate,
                                        };
                                    }
                                }
                            });
                        });
                    });

                    // Set the discount changes state (this will show the discount values in coating inputs)
                    setDiscountChanges(newDiscountChanges);

                    // Note: We don't set hasUnsavedChanges to true since these are already saved discounts
                }
            }
        } catch (error) {
            console.error('Error fetching discount data:', error);
            toast({
                title: 'Error',
                description: 'Failed to load discount data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // Toggle expansion
    const toggleBrand = (brandId) => {
        const newExpanded = new Set(expandedBrands);
        if (newExpanded.has(brandId)) {
            newExpanded.delete(brandId);
        } else {
            newExpanded.add(brandId);
        }
        setExpandedBrands(newExpanded);
    };

    const toggleProduct = (productId) => {
        const newExpanded = new Set(expandedProducts);
        if (newExpanded.has(productId)) {
            newExpanded.delete(productId);
        } else {
            newExpanded.add(productId);
        }
        setExpandedProducts(newExpanded);
    };

    // Toggle Expand/Collapse all functionality
    const toggleExpandCollapseAll = () => {
        if (isAllExpanded) {
            // Collapse all
            setExpandedBrands(new Set());
            setExpandedProducts(new Set());
            setIsAllExpanded(false);

            toast({
                title: 'Collapsed All',
                description: 'All brands and products are now collapsed',
            });
        } else {
            // Expand all
            const allBrandIds = new Set(brandsData.map(b => b.id));
            const allProductIds = new Set();

            brandsData.forEach(brand => {
                brand.lensProductMasters?.forEach(product => {
                    allProductIds.add(product.id);
                });
            });

            setExpandedBrands(allBrandIds);
            setExpandedProducts(allProductIds);
            setIsAllExpanded(true);

            toast({
                title: 'Expanded All',
                description: 'All brands and products are now expanded',
            });
        }
    };

    // Handle discount changes - Optimized to directly update coating prices
    const handleBrandDiscount = (brandId, value) => {
        const discount = parseFloat(value) || 0;
        if (discount < 0 || discount > 100) {
            toast({
                title: 'Invalid Discount',
                description: 'Discount must be between 0 and 100',
                variant: 'destructive',
            });
            return;
        }

        // Store brand-level discount for display
        setBrandDiscounts(prev => ({
            ...prev,
            [brandId]: discount
        }));

        // Find the brand and apply discount to ALL coatings in ALL products
        const brand = brandsData.find(b => b.id === brandId);
        if (!brand || !brand.lensProductMasters) return;

        const newChanges = { ...discountChanges };
        const newProductDiscounts = { ...productDiscounts };

        // Cascade discount to all products and coatings in this brand
        brand.lensProductMasters.forEach(product => {
            // Set product-level discount for display
            newProductDiscounts[product.id] = discount;

            if (product.lensPriceMasters) {
                product.lensPriceMasters.forEach(priceData => {
                    newChanges[`coating_${priceData.id}`] = {
                        type: 'coating',
                        brandId,
                        productId: product.id,
                        coatingId: priceData.coating.id,
                        priceId: priceData.id,
                        discount,
                    };
                });
            }
        });

        setProductDiscounts(newProductDiscounts);
        setDiscountChanges(newChanges);
        setHasUnsavedChanges(true);

        toast({
            title: 'Brand Discount Applied',
            description: `${discount}% discount applied to all products and coatings in ${brand.name}`,
        });
    };

    const handleProductDiscount = (brandId, productId, value) => {
        const discount = parseFloat(value) || 0;
        if (discount < 0 || discount > 100) {
            toast({
                title: 'Invalid Discount',
                description: 'Discount must be between 0 and 100',
                variant: 'destructive',
            });
            return;
        }

        // Store product-level discount for display
        setProductDiscounts(prev => ({
            ...prev,
            [productId]: discount
        }));

        // Find the product and apply discount to ALL coatings
        const brand = brandsData.find(b => b.id === brandId);
        if (!brand) return;

        const product = brand.lensProductMasters?.find(p => p.id === productId);
        if (!product || !product.lensPriceMasters) return;

        const newChanges = { ...discountChanges };

        // Cascade discount to all coatings in this product
        product.lensPriceMasters.forEach(priceData => {
            newChanges[`coating_${priceData.id}`] = {
                type: 'coating',
                brandId,
                productId,
                coatingId: priceData.coating.id,
                priceId: priceData.id,
                discount,
            };
        });

        setDiscountChanges(newChanges);
        setHasUnsavedChanges(true);

        toast({
            title: 'Product Discount Applied',
            description: `${discount}% discount applied to all coatings in ${product.lens_name}`,
        });
    };

    const handleCoatingDiscount = (brandId, productId, coatingId, priceId, value) => {
        const discount = parseFloat(value) || 0;
        if (discount < 0 || discount > 100) {
            toast({
                title: 'Invalid Discount',
                description: 'Discount must be between 0 and 100',
                variant: 'destructive',
            });
            return;
        }

        setDiscountChanges((prev) => ({
            ...prev,
            [`coating_${priceId}`]: {
                type: 'coating',
                brandId,
                productId,
                coatingId,
                priceId,
                discount,
            },
        }));
        setHasUnsavedChanges(true);
    };

    // Save all discount changes
    const saveDiscounts = async () => {
        if (Object.keys(discountChanges).length === 0) {
            toast({
                title: 'No Changes',
                description: 'No discount changes to save',
            });
            return;
        }

        if (!selectedCustomer) {
            toast({
                title: 'Error',
                description: 'Please select a customer first',
                variant: 'destructive',
            });
            return;
        }

        setSaving(true);
        try {
            const response = await apiClient('post', '/v1/lens-products/apply-discounts', {
                data: {
                    customerId: selectedCustomer.id,
                    discounts: Object.values(discountChanges)
                },
            });

            if (response.success) {
                toast({
                    title: 'Success',
                    description: `Discounts applied successfully to ${response.data.affected} items`,
                });
                setDiscountChanges({});
                setBrandDiscounts({});
                setProductDiscounts({});
                setHasUnsavedChanges(false);
                fetchDiscountData(); // Refresh data
            }
        } catch (error) {
            console.error('Error saving discounts:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to save discounts',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    // Reset changes
    const resetChanges = () => {
        setDiscountChanges({});
        setBrandDiscounts({});
        setProductDiscounts({});
        setHasUnsavedChanges(false);
        toast({
            title: 'Changes Reset',
            description: 'All unsaved changes have been discarded',
        });
    };

    // Calculate discounted price
    const calculateDiscountedPrice = (price, discount) => {
        return price - (price * discount) / 100;
    };

    // Get current discount value for input
    const getCurrentDiscount = (key) => {
        return discountChanges[key]?.discount || 0;
    };

    // Filter brands based on search
    const filteredBrands = brandsData.filter((brand) =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.lensProductMasters?.some((product) =>
            product.lens_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    // Render coating row
    const renderCoating = (brand, product, coating, priceData) => {
        const key = `coating_${priceData.id}`;
        const currentDiscount = getCurrentDiscount(key);
        const originalPrice = priceData.price;
        const discountedPrice = calculateDiscountedPrice(originalPrice, currentDiscount);

        return (
            <div
                key={priceData.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded border border-muted hover:border-primary/20 transition-colors"
            >
                <div className="flex items-center gap-3 flex-1">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                        <div className="font-medium text-sm">{coating.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                            Original Price: ₹{originalPrice.toFixed(2)}
                            {currentDiscount > 0 && (
                                <span className="ml-2 text-green-600 font-medium">
                                    → ₹{discountedPrice.toFixed(2)}
                                </span>
                            )}
                            {currentDiscount > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    -{currentDiscount}%
                                </Badge>
                            )}
                        </div>

                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="0"
                            value={currentDiscount || ''}
                            onChange={(e) =>
                                handleCoatingDiscount(
                                    brand.id,
                                    product.id,
                                    coating.id,
                                    priceData.id,
                                    e.target.value
                                )
                            }
                            className="w-20 h-8 text-sm"
                        />
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>

                </div>
            </div>
        );
    };

    // Render product row
    const renderProduct = (brand, product) => {
        const isExpanded = expandedProducts.has(product.id);
        const productKey = `product_${product.id}`;
        const currentDiscount = getCurrentDiscount(productKey);
        const hasCoatings = product.lensPriceMasters && product.lensPriceMasters.length > 0;

        // Get product-level discount value for display
        const productDiscountValue = productDiscounts[product.id] || '';

        return (
            <div key={product.id} className="border-l-2 border-primary/20 ml-6 pl-4 space-y-2">
                <div
                    className="flex items-center justify-between p-3 bg-background rounded border hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => hasCoatings && toggleProduct(product.id)}
                >
                    <div className="flex items-center gap-3 flex-1">
                        {hasCoatings && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleProduct(product.id);
                                }}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                        {!hasCoatings && <div className="w-6" />}

                        <Package className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                            <div className="font-semibold text-sm">{product.lens_name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {product.product_code}
                                {hasCoatings && (
                                    <span className="ml-2">• {product.lensPriceMasters.length} coating(s)</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {!customerHasPriceMapping && (
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground mr-2">
                                Apply to all coatings:
                            </Label>
                            <div className="flex items-center gap-1">
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    placeholder="0"
                                    value={productDiscountValue}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleProductDiscount(brand.id, product.id, e.target.value);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-20 h-8 text-sm"
                                />
                                <Percent className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Coatings */}
                {isExpanded && hasCoatings && (
                    <div className="ml-8 space-y-2">
                        {product.lensPriceMasters.map((priceData) =>
                            renderCoating(brand, product, priceData.coating, priceData)
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render brand row
    const renderBrand = (brand) => {
        const isExpanded = expandedBrands.has(brand.id);
        const brandKey = `brand_${brand.id}`;
        const currentDiscount = getCurrentDiscount(brandKey);
        const hasProducts = brand.lensProductMasters && brand.lensProductMasters.length > 0;

        // Get brand-level discount value for display
        const brandDiscountValue = brandDiscounts[brand.id] || '';

        console.log('Rendering brand:', brand.name,
            '\nHas products:', hasProducts,
            "\nisExpanded", isExpanded,
            "\nbrandKey", brandKey,
            "\ncurrentDiscount", currentDiscount,
            "\nBrand Data:", brand
        );
        return (
            <Card key={brand.id} className="mb-4">
                <CardContent className="p-4">
                    <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => hasProducts && toggleBrand(brand.id)}
                    >
                        <div className="flex items-center gap-3 flex-1">
                            {hasProducts && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleBrand(brand.id);
                                    }}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-5 w-5" />
                                    ) : (
                                        <ChevronRight className="h-5 w-5" />
                                    )}
                                </Button>
                            )}
                            {!hasProducts && <div className="w-8" />}

                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg font-bold text-primary">
                                    {brand.name.charAt(0).toUpperCase()}
                                </span>
                            </div>

                            <div className="flex-1">
                                <h3 className="font-bold text-lg">{brand.name}</h3>
                                {hasProducts && (
                                    <p className="text-sm text-muted-foreground">
                                        {brand.lensProductMasters.length} product(s)
                                    </p>
                                )}
                            </div>
                        </div>

                        {!customerHasPriceMapping && (
                            <div className="flex items-center gap-2">
                                <Label className="text-sm text-muted-foreground mr-2">
                                    Apply to all products:
                                </Label>
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        placeholder="0"
                                        value={brandDiscountValue}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleBrandDiscount(brand.id, e.target.value);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-24 h-9"
                                    />
                                    <Percent className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Products */}
                    {isExpanded && hasProducts && (
                        <div className="mt-4 space-y-3">
                            {brand.lensProductMasters.map((product) => renderProduct(brand, product))}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="flex flex-col h-full p-3 gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isEmbeddedMode && (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => navigate("/sales/customers")}
                            disabled={saving}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold">
                            {'Customer Discount Management'}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isEmbeddedMode
                                ? `Manage pricing for ${selectedCustomer?.name || 'Customer'}`
                                : 'Apply customer-specific discounts at brand, product, or coating level'
                            }
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {hasUnsavedChanges && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {Object.keys(discountChanges).length} unsaved change(s)
                        </Badge>
                    )}
                    <Button
                        variant="outline"
                        onClick={resetChanges}
                        disabled={!hasUnsavedChanges || saving || !selectedCustomer}
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                    </Button>
                    <Button
                        onClick={saveDiscounts}
                        disabled={!hasUnsavedChanges || saving || !selectedCustomer}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Discounts'}
                    </Button>
                </div>
            </div>

            {/* Customer Selection - Compact */}
            <Card>
                <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                        {/* Customer Dropdown or Read-only Display */}
                        <div className="flex-1">
                            {isEmbeddedMode ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">
                                            {selectedCustomer?.name || 'Loading...'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {selectedCustomer?.code} {selectedCustomer?.shopname && `• ${selectedCustomer.shopname}`}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <FormSelect
                                    value={selectedCustomer?.id || ''}
                                    onChange={(value) => {
                                        const customer = customers.find(c => c.id === parseInt(value));
                                        setSelectedCustomer(customer || null);
                                        setBrandsData([]);
                                        setDiscountChanges({});
                                        setBrandDiscounts({});
                                        setProductDiscounts({});
                                        setExpandedBrands(new Set());
                                        setExpandedProducts(new Set());
                                        setIsAllExpanded(false);
                                        setHasUnsavedChanges(false);
                                    }}
                                    options={customers.map(c => ({
                                        value: c.id,
                                        label: `${c.name} (${c.code}) - ${c.shopname || 'N/A'}`
                                    }))}
                                    placeholder="Select Customer..."
                                    className="w-full"
                                />
                            )}
                        </div>

                        {/* Search Box - Only visible when customer selected */}
                        {selectedCustomer && (
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search brands or products..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Pricing Status Badge */}
                        {selectedCustomer && (
                            <Badge
                                variant={customerHasPriceMapping ? "default" : "secondary"}
                                className="px-3 py-1.5"
                            >
                                {customerHasPriceMapping ? '✓ Custom Pricing' : '○ Standard Pricing'}
                            </Badge>
                        )}

                        {/* Expand/Collapse All Toggle Button */}
                        {selectedCustomer && brandsData.length > 0 && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={toggleExpandCollapseAll}
                                title={isAllExpanded ? "Collapse All" : "Expand All"}
                            >
                                {isAllExpanded ? (
                                    <ChevronsUpDown className="h-4 w-4" />
                                ) : (
                                    <ChevronsDownUp className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Brands List */}
            <div className="flex-1 overflow-y-auto">
                {!selectedCustomer ? (
                    <Card className="border-2 border-dashed">
                        <CardContent className="p-8 text-center">
                            <User className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <h3 className="text-lg font-semibold text-muted-foreground mb-1">
                                No Customer Selected
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Select a customer to manage discounts
                            </p>
                        </CardContent>
                    </Card>
                ) : loading ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">Loading discount data...</p>
                        </CardContent>
                    </Card>
                ) : filteredBrands.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">
                                {searchQuery ? 'No brands or products found' : 'No brands available'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredBrands.map((brand) => renderBrand(brand))
                )}
            </div>
        </div>
    );
}
