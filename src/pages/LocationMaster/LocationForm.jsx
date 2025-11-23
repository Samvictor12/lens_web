import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  createLocation,
  getLocationById,
  updateLocation,
} from "../../services/location";
import { defaultLocation, activeStatusOptions } from "./Location.constants";

export default function LocationForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultLocation);
  const [originalData, setOriginalData] = useState(defaultLocation);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getLocationById(parseInt(id));

          if (response.success) {
            const location = response.data;
            const locationData = {
              name: location.name || "",
              locationCode: location.locationCode || "",
              description: location.description || "",
              activeStatus:
                location.activeStatus !== undefined
                  ? location.activeStatus
                  : true,
            };
            setFormData(locationData);
            setOriginalData(locationData);
          } else {
            toast({
              title: "Error",
              description: "Location not found",
              variant: "destructive",
            });
            navigate("/masters/location");
          }
        } catch (error) {
          console.error("Error fetching location:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch location details",
            variant: "destructive",
          });
          navigate("/masters/location");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchLocation();
  }, [id, mode, navigate, toast]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Location name is required";
    }

    if (!formData.locationCode.trim()) {
      newErrors.locationCode = "Location code is required";
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      if (mode === "add") {
        const response = await createLocation(formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Location added successfully!",
          });
          navigate("/masters/location");
        }
      } else if (mode === "edit" || isEditing) {
        const response = await updateLocation(parseInt(id), formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Location updated successfully!",
          });

          setOriginalData(formData);
          setIsEditing(false);
          navigate("/masters/location");
        }
      }
    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/location");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        setFormData(originalData);
        setErrors({});
        setIsEditing(false);
        navigate("/masters/location");
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

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            {mode === "add"
              ? "Add Location"
              : mode === "edit" || isEditing
              ? "Edit Location"
              : "View Location"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Create a new warehouse location"
              : mode === "edit" || isEditing
              ? "Update location details"
              : "View location information"}
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
      {isLoading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Loading location details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Location Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  placeholder="Enter location name (e.g., Hall, Kitchen)"
                  required
                  disabled={mode === "view" && !isEditing}
                />

                <FormInput
                  label="Location Code"
                  name="locationCode"
                  value={formData.locationCode}
                  onChange={handleChange}
                  error={errors.locationCode}
                  placeholder="Enter location code (e.g., LOC-001)"
                  required
                  disabled={mode === "view" && !isEditing}
                />
              </div>

              <FormTextarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                error={errors.description}
                placeholder="Enter location description (optional)"
                disabled={mode === "view" && !isEditing}
                rows={3}
              />

              <FormSelect
                label="Status"
                name="activeStatus"
                options={activeStatusOptions}
                value={formData.activeStatus}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, activeStatus: value }));
                }}
                disabled={mode === "view" && !isEditing}
                isSearchable={false}
                isClearable={false}
              />
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
