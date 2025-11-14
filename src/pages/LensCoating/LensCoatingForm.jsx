import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  createLensCoating,
  getLensCoatingById,
  updateLensCoating,
} from "../../services/lensCoating";
import { defaultLensCoating, activeStatusOptions } from "./LensCoating.constants";

export default function LensCoatingForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultLensCoating);
  const [originalData, setOriginalData] = useState(defaultLensCoating);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCoating = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getLensCoatingById(parseInt(id));

          if (response.success) {
            const coating = response.data;
            const coatingData = {
              name: coating.name || "",
              short_name: coating.short_name || "",
              description: coating.description || "",
              activeStatus:
                coating.activeStatus !== undefined
                  ? coating.activeStatus
                  : true,
            };
            setFormData(coatingData);
            setOriginalData(coatingData);
          } else {
            toast({
              title: "Error",
              description: "Lens coating not found",
              variant: "destructive",
            });
            navigate("/masters/lens-coating");
          }
        } catch (error) {
          console.error("Error fetching lens coating:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch lens coating details",
            variant: "destructive",
          });
          navigate("/masters/lens-coating");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchCoating();
  }, [id, mode, navigate]);

  const validateForm = () => {
    const newErrors = {};

    // Name validation (required)
    if (!formData.name.trim()) {
      newErrors.name = "Coating name is required";
    }

    // Short name validation (required)
    if (!formData.short_name.trim()) {
      newErrors.short_name = "Short name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      if (mode === "add") {
        // Create new coating
        const response = await createLensCoating(formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Lens coating added successfully!",
          });
          navigate("/masters/lens-coating");
        }
      } else if (mode === "edit" || isEditing) {
        // Update existing coating
        const response = await updateLensCoating(parseInt(id), formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Lens coating updated successfully!",
          });

          // Update local data and exit edit mode
          setOriginalData(formData);
          setIsEditing(false);
          navigate("/masters/lens-coating");
        }
      }
    } catch (error) {
      console.error("Error saving lens coating:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save lens coating. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/lens-coating");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        setFormData(originalData);
        setIsEditing(false);
        setErrors({});
        navigate("/masters/lens-coating");
      }
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      // Canceling edit mode - reset to original data
      setFormData(originalData);
      setErrors({});
    }
    setIsEditing(!isEditing);
  };

  const isReadOnly = mode === "view" && !isEditing;

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            {mode === "add"
              ? "Add New Lens Coating"
              : mode === "edit"
              ? "Edit Lens Coating"
              : "Lens Coating Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the lens coating information below"
              : mode === "edit"
              ? "Update lens coating information"
              : "View lens coating information"}
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
                <>
                  <X className="h-3.5 w-3.5" />
                  Cancel Edit
                </>
              ) : (
                <>
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </>
              )}
            </Button>
          )}

          {(mode !== "view" || isEditing) && (
            <>
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
                  <>
                    <Save className="h-3.5 w-3.5" />
                    {mode === "add" ? "Save Changes" : "Update Changes"}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Form */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Loading lens coating details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              {/* Coating Name */}
              <FormInput
                label="Coating Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isReadOnly}
                required
                error={errors.name}
                helperText={!errors.name && "Enter a unique coating name"}
              />

              {/* Short Name */}
              <FormInput
                label="Short Name"
                name="short_name"
                value={formData.short_name}
                onChange={handleChange}
                disabled={isReadOnly}
                required
                error={errors.short_name}
                helperText={!errors.short_name && "Enter a short abbreviation (e.g., UC, HC, AR)"}
              />

              {/* Description */}
              <FormTextarea
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={3}
                placeholder="Enter a brief description of this lens coating"
              />

              {/* Active Status - React Select */}
              <FormSelect
                label="Status"
                name="activeStatus"
                options={activeStatusOptions.map((opt) => ({
                  id: opt.value,
                  name: opt.label,
                }))}
                value={formData.activeStatus}
                onChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    activeStatus: value,
                  }));
                  // Clear error when value changes
                  if (errors.activeStatus) {
                    setErrors((prev) => ({ ...prev, activeStatus: "" }));
                  }
                }}
                placeholder="Select status"
                isSearchable={false}
                isClearable={false}
                disabled={isReadOnly}
                required
                error={errors.activeStatus}
              />

              {/* Info Alert */}
              {mode === "add" && (
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription className="text-xs">
                    Fields marked with{" "}
                    <span className="text-destructive">*</span> are required.
                    This coating will be available for lens price configuration.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
