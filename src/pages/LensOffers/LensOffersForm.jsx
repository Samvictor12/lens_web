import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  createLensOffer,
  getLensOfferById,
  updateLensOffer,
} from "@/services/lensOffers";
import { apiClient } from "@/services/apiClient";
import {
  defaultLensOffer,
  activeStatusOptions,
  offerTypeOptions,
  offerTypeLabel,
  offerTypeBadgeVariant,
} from "./LensOffers.constants";

export default function LensOffersForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultLensOffer);
  const [originalData, setOriginalData] = useState(defaultLensOffer);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dropdown options
  const [lensOptions, setLensOptions] = useState([]);
  const [coatingOptions, setCoatingOptions] = useState([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(false);

  // Load dropdowns
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        setDropdownsLoading(true);
        const [lensRes, coatingRes] = await Promise.all([
          apiClient("get", "/v1/lens-products/dropdown"),
          apiClient("get", "/v1/lens-coatings/dropdown"),
        ]);
        setLensOptions(
          (lensRes.data || []).map((l) => ({
            id: l.id,
            name: l.lens_name || l.label || l.name,
          }))
        );
        setCoatingOptions(
          (coatingRes.data || []).map((c) => ({
            id: c.id,
            name: c.name || c.label,
          }))
        );
      } catch (err) {
        console.error("Error loading dropdowns:", err);
      } finally {
        setDropdownsLoading(false);
      }
    };
    loadDropdowns();
  }, []);

  // Load offer data for view/edit
  useEffect(() => {
    const fetchOffer = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const offer = await getLensOfferById(parseInt(id));
          const offerData = {
            offerName: offer.offerName || "",
            description: offer.description || "",
            offerType: offer.offerType || "VALUE",
            discountValue: offer.discountValue ?? "",
            discountPercentage: offer.discountPercentage ?? "",
            offerPrice: offer.offerPrice ?? "",
            lens_id: offer.lens_id ?? null,
            coating_id: offer.coating_id ?? null,
            exchange_coating_id: offer.exchange_coating_id ?? null,
            withDiscount: offer.withDiscount ?? false,
            startDate: offer.startDate || "",
            endDate: offer.endDate || "",
            activeStatus: offer.activeStatus !== undefined ? offer.activeStatus : true,
          };
          setFormData(offerData);
          setOriginalData(offerData);
        } catch (error) {
          console.error("Error fetching lens offer:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch lens offer details",
            variant: "destructive",
          });
          navigate("/masters/lens-offers");
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchOffer();
  }, [id, mode, navigate]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.offerName.trim()) {
      newErrors.offerName = "Offer name is required";
    }

    if (!formData.offerType) {
      newErrors.offerType = "Offer type is required";
    }

    if (formData.offerType === "VALUE") {
      if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
        newErrors.discountValue = "Discount value must be greater than 0";
      }
    } else if (formData.offerType === "PERCENTAGE") {
      const pct = parseFloat(formData.discountPercentage);
      if (!formData.discountPercentage || pct <= 0 || pct > 100) {
        newErrors.discountPercentage = "Discount percentage must be between 1 and 100";
      }
    } else if (formData.offerType === "EXCHANGE_PRODUCT") {
      // No price field — product price comes from the selected lens+coating
    } else if (formData.offerType === "EXCHANGE_COATING_PRICE") {
      if (!formData.exchange_coating_id) {
        newErrors.exchange_coating_id = "Exchange coating is required";
      }
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // When offer type changes, clear the irrelevant discount fields
  const handleOfferTypeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      offerType: value,
      discountValue: "",
      discountPercentage: "",
      offerPrice: "",
      exchange_coating_id: null,
      withDiscount: false,
    }));
    setErrors((prev) => ({
      ...prev,
      offerType: "",
      discountValue: "",
      discountPercentage: "",
      offerPrice: "",
      exchange_coating_id: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      if (mode === "add") {
        await createLensOffer(formData);
        toast({ title: "Success", description: "Lens offer created successfully!" });
        navigate("/masters/lens-offers");
      } else if (mode === "edit" || isEditing) {
        await updateLensOffer(parseInt(id), formData);
        toast({ title: "Success", description: "Lens offer updated successfully!" });
        setOriginalData(formData);
        setIsEditing(false);
        navigate("/masters/lens-offers");
      }
    } catch (error) {
      console.error("Error saving lens offer:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save lens offer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/lens-offers");
    } else {
      const confirmCancel = window.confirm("Are you sure? Any unsaved changes will be lost.");
      if (confirmCancel) {
        setFormData(originalData);
        setIsEditing(false);
        setErrors({});
        navigate("/masters/lens-offers");
      }
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      setFormData(originalData);
      setErrors({});
    }
    setIsEditing(!isEditing);
  };

  const isReadOnly = mode === "view" && !isEditing;

  // Determine which fields to show based on offer type
  const showDiscountValue = formData.offerType === "VALUE";
  const showDiscountPercentage = formData.offerType === "PERCENTAGE";
  const showAppliesTo = formData.offerType === "EXCHANGE_PRODUCT";
  const showExchangeCoating = formData.offerType === "EXCHANGE_COATING_PRICE";

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            {mode === "add"
              ? "Add New Lens Offer"
              : mode === "edit"
              ? "Edit Lens Offer"
              : "Lens Offer Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Configure a promotional offer for lenses"
              : mode === "edit"
              ? "Update lens offer details"
              : "View lens offer details"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-8 gap-1.5"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          {mode === "view" && (
            <Button
              size="xs"
              className="h-8 gap-1.5"
              variant={isEditing ? "outline" : "default"}
              onClick={toggleEdit}
            >
              {isEditing ? (
                <><X className="h-3.5 w-3.5" /> Cancel Edit</>
              ) : (
                <><Edit className="h-3.5 w-3.5" /> Edit</>
              )}
            </Button>
          )}
          {(mode !== "view" || isEditing) && (
            <Button
              type="submit"
              size="xs"
              className="h-8 gap-1.5"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <><Save className="h-3.5 w-3.5" /> {mode === "add" ? "Save Offer" : "Update Offer"}</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading offer details...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Offer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-4">
              {/* Offer Name */}
              <FormInput
                label="Offer Name"
                name="offerName"
                value={formData.offerName}
                onChange={handleChange}
                disabled={isReadOnly}
                required
                error={errors.offerName}
                placeholder="e.g., Blu Cut Summer Offer"
                helperText={!errors.offerName && "Enter a unique, descriptive offer name"}
              />

              {/* Description */}
              <FormTextarea
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={2}
                placeholder="Enter a brief description of this offer"
              />

              {/* Status */}
              <FormSelect
                label="Status"
                name="activeStatus"
                options={activeStatusOptions.map((o) => ({ id: o.value, name: o.label }))}
                value={formData.activeStatus}
                onChange={(value) => handleSelectChange("activeStatus", value)}
                placeholder="Select status"
                isSearchable={false}
                isClearable={false}
                disabled={isReadOnly}
                required
                error={errors.activeStatus}
              />
            </CardContent>
          </Card>

          {/* Offer Type & Discount */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm font-semibold">
                Offer Type & Discount
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-4">
              {/* Offer Type */}
              <FormSelect
                label="Offer Type"
                name="offerType"
                options={offerTypeOptions}
                value={formData.offerType}
                onChange={handleOfferTypeChange}
                placeholder="Select offer type"
                isSearchable={false}
                isClearable={false}
                disabled={isReadOnly}
                required
                error={errors.offerType}
                helperText={
                  !errors.offerType &&
                  !isReadOnly && (
                    <span>
                      <strong>Value</strong>: Fixed ₹ discount &nbsp;|&nbsp;
                      <strong>Percentage</strong>: % off &nbsp;|&nbsp;
                      <strong>Exchange</strong>: Set a specific offer price
                    </span>
                  )
                }
              />

              {/* VALUE: Discount Amount */}
              {showDiscountValue && (
                <FormInput
                  label="Discount Amount (₹)"
                  name="discountValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discountValue}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                  error={errors.discountValue}
                  placeholder="e.g., 100"
                  helperText={!errors.discountValue && "Fixed amount to deduct from lens price"}
                />
              )}

              {/* PERCENTAGE: Discount % */}
              {showDiscountPercentage && (
                <FormInput
                  label="Discount Percentage (%)"
                  name="discountPercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discountPercentage}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                  error={errors.discountPercentage}
                  placeholder="e.g., 20"
                  helperText={!errors.discountPercentage && "Percentage discount on the lens price"}
                />
              )}

              {/* EXCHANGE_PRODUCT: no price field — price is derived from the selected lens+coating product */}
              {formData.offerType === "EXCHANGE_PRODUCT" && !isReadOnly && (
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription className="text-xs">
                    For <strong>Exchange Product</strong> offers, select the Lens and Coating below.
                    When that combination is chosen in a Sale Order, its price will be used as the offer price.
                  </AlertDescription>
                </Alert>
              )}

              {/* EXCHANGE_COATING_PRICE: select exchange coating + withDiscount toggle */}
              {showExchangeCoating && (
                <>
                  <FormSelect
                    label="Exchange Coating"
                    name="exchange_coating_id"
                    options={coatingOptions}
                    value={formData.exchange_coating_id}
                    onChange={(value) => handleSelectChange("exchange_coating_id", value)}
                    placeholder={dropdownsLoading ? "Loading..." : "Select exchange coating"}
                    isSearchable={true}
                    isClearable={false}
                    disabled={isReadOnly || dropdownsLoading}
                    required
                    error={errors.exchange_coating_id}
                    helperText={
                      !errors.exchange_coating_id &&
                      "The coating whose price will be used instead of the selected coating in the sale order"
                    }
                  />

                  <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
                    <input
                      type="checkbox"
                      id="withDiscount"
                      checked={formData.withDiscount}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, withDiscount: e.target.checked }))
                      }
                      disabled={isReadOnly}
                      className="mt-0.5 h-4 w-4 cursor-pointer"
                    />
                    <div>
                      <label
                        htmlFor="withDiscount"
                        className="text-sm font-medium cursor-pointer"
                      >
                        With Discount
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        If enabled, the customer's configured discount rate will be applied on top of the
                        exchange coating price. If disabled, no discount is applied.
                      </p>
                    </div>
                  </div>

                  {!isReadOnly && (
                    <Alert className="bg-primary/5 border-primary/20">
                      <AlertDescription className="text-xs">
                        When this offer is applied in a Sale Order, the price of the selected{" "}
                        <strong>exchange coating</strong> for the same lens will be used as the lens
                        price&mdash;regardless of which coating the customer picked.
                        {formData.withDiscount
                          ? " The customer's discount rate will also be applied."
                          : " No customer discount will be applied."}
                      </AlertDescription>
                    </Alert>
                  )}

                  {isReadOnly && formData.exchange_coating_id && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">With Discount: </span>
                      {formData.withDiscount ? "Yes" : "No"}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Applies To — only shown for EXCHANGE_PRODUCT */}
          {showAppliesTo && <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm font-semibold">
                Applies To{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (Optional – leave blank to apply to all)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-4">
              {/* Lens Product */}
              <FormSelect
                label="Lens Product"
                name="lens_id"
                options={lensOptions}
                value={formData.lens_id}
                onChange={(value) => handleSelectChange("lens_id", value)}
                placeholder={dropdownsLoading ? "Loading..." : "All lens products"}
                isSearchable={true}
                isClearable={true}
                disabled={isReadOnly || dropdownsLoading}
                error={errors.lens_id}
                helperText={
                  !errors.lens_id &&
                  "Select a specific lens this offer applies to (or leave blank for all)"
                }
              />

              {/* Coating */}
              <FormSelect
                label="Coating"
                name="coating_id"
                options={coatingOptions}
                value={formData.coating_id}
                onChange={(value) => handleSelectChange("coating_id", value)}
                placeholder={dropdownsLoading ? "Loading..." : "All coatings"}
                isSearchable={true}
                isClearable={true}
                disabled={isReadOnly || dropdownsLoading}
                error={errors.coating_id}
                helperText={
                  !errors.coating_id &&
                  "Select a specific coating this offer applies to (e.g., Blu Cut)"
                }
              />

              {/* Logic explanation */}
              {!isReadOnly && (formData.lens_id || formData.coating_id) && (
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription className="text-xs">
                    This offer will apply in the Sale Order when{" "}
                    {formData.lens_id && formData.coating_id
                      ? "both the selected lens AND coating match — the matched product's price will be used"
                      : formData.lens_id
                      ? "the selected lens product is chosen"
                      : "the selected coating is chosen"}
                    .
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>}

          {/* Validity Period */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm font-semibold">Validity Period</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                  error={errors.startDate}
                  helperText={!errors.startDate && "Offer becomes active from this date"}
                />
                <FormInput
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                  error={errors.endDate}
                  helperText={!errors.endDate && "Offer expires after this date"}
                />
              </div>

              {/* Live status preview */}
              {formData.startDate && formData.endDate && !errors.startDate && !errors.endDate && (
                <div className="mt-3">
                  {(() => {
                    const now = new Date();
                    const start = new Date(formData.startDate);
                    const end = new Date(formData.endDate);
                    if (start <= now && end >= now) {
                      return (
                        <Badge variant="default" className="text-xs">
                          ✓ Offer will be live
                        </Badge>
                      );
                    } else if (start > now) {
                      return (
                        <Badge variant="secondary" className="text-xs">
                          ⏳ Upcoming offer
                        </Badge>
                      );
                    } else {
                      return (
                        <Badge variant="destructive" className="text-xs">
                          ✗ Dates are in the past
                        </Badge>
                      );
                    }
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info alert for add mode */}
          {mode === "add" && (
            <Alert className="bg-primary/5 border-primary/20">
              <AlertDescription className="text-xs">
                Fields marked with <span className="text-destructive">*</span> are required.
                This offer will be displayed in Sale Orders when a matching lens/coating is selected
                and the current date is within the validity period.
              </AlertDescription>
            </Alert>
          )}
        </form>
      )}
    </div>
  );
}
