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
  createLensTinting,
  getLensTintingById,
  updateLensTinting,
} from "../../services/lensTinting";
import { defaultLensTinting, activeStatusOptions } from "./LensTinting.constants";

export default function LensTintingForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultLensTinting);
  const [originalData, setOriginalData] = useState(defaultLensTinting);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchTinting = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const tinting = await getLensTintingById(parseInt(id));

          const tintingData = {
            name: tinting.name || "",
            short_name: tinting.short_name || "",
            description: tinting.description || "",
            activeStatus:
              tinting.activeStatus !== undefined
                ? tinting.activeStatus
                : true,
          };
          setFormData(tintingData);
          setOriginalData(tintingData);
        } catch (error) {
          console.error("Error fetching lens tinting:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch lens tinting details",
            variant: "destructive",
          });
          navigate("/masters/lens-tinting");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchTinting();
  }, [id, mode, navigate]);

  const validateForm = () => {
    const newErrors = {};

    // Name validation (required)
    if (!formData.name.trim()) {
      newErrors.name = "Tinting name is required";
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
        // Create new tinting
        await createLensTinting(formData);
        toast({
          title: "Success",
          description: "Lens tinting added successfully!",
        });
        navigate("/masters/lens-tinting");
      } else if (mode === "edit" || isEditing) {
        // Update existing tinting
        await updateLensTinting(parseInt(id), formData);
        toast({
          title: "Success",
          description: "Lens tinting updated successfully!",
        });

        // Update local data and exit edit mode
        setOriginalData(formData);
        setIsEditing(false);
        navigate("/masters/lens-tinting");
      }
    } catch (error) {
      console.error("Error saving lens tinting:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save lens tinting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/lens-tinting");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        setFormData(originalData);
        setIsEditing(false);
        setErrors({});
        navigate("/masters/lens-tinting");
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
              ? "Add New Lens Tinting"
              : mode === "edit"
              ? "Edit Lens Tinting"
              : "Lens Tinting Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the lens tinting information below"
              : mode === "edit"
              ? "Update lens tinting information"
              : "View lens tinting information"}
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
                Loading lens tinting details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              {/* Tinting Name */}
              <FormInput
                label="Tinting Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isReadOnly}
                required
                error={errors.name}
                helperText={!errors.name && "Enter a unique tinting name (e.g., 'Clear', 'Light Brown')"}
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
                helperText={!errors.short_name && "Enter a short code (e.g., 'CLR', 'LBR')"}
              />

              {/* Description */}
              <FormTextarea
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={3}
                placeholder="Enter a brief description of this lens tinting"
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
                    This tinting will be available for sale order assignment.
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
