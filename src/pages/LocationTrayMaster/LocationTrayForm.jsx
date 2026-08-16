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
  createLocationTray,
  getLocationTrayById,
  updateLocationTray,
} from "../../services/locationTray";
import {
  defaultLocationTray,
  activeStatusOptions,
} from "./LocationTray.constants";

export default function LocationTrayForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultLocationTray);
  const [originalData, setOriginalData] = useState(defaultLocationTray);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchTray = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getLocationTrayById(parseInt(id));

          if (response.success) {
            const tray = response.data;
            const trayData = {
              name: tray.name || "",
              description: tray.description || "",
              activeStatus:
                tray.activeStatus !== undefined ? tray.activeStatus : true,
            };
            setFormData(trayData);
            setOriginalData(trayData);
          } else {
            toast({
              title: "Error",
              description: "Tray not found",
              variant: "destructive",
            });
            navigate("/masters/location-tray");
          }
        } catch (error) {
          console.error("Error fetching location tray:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch tray details",
            variant: "destructive",
          });
          navigate("/masters/location-tray");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchTray();
  }, [id, mode, navigate, toast]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Tray name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue =
      type === "number" ? (value === "" ? 0 : parseInt(value)) : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));

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
        const response = await createLocationTray(formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Tray added successfully!",
          });
          navigate("/masters/location-tray");
        }
      } else if (mode === "edit" || isEditing) {
        const response = await updateLocationTray(parseInt(id), formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Tray updated successfully!",
          });

          setOriginalData(formData);
          setIsEditing(false);
          navigate("/masters/location-tray");
        }
      }
    } catch (error) {
      console.error("Error saving location tray:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save tray. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/location-tray");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        setFormData(originalData);
        setErrors({});
        setIsEditing(false);
        navigate("/masters/location-tray");
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

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            {mode === "add"
              ? "Add Tray"
              : mode === "edit" || isEditing
              ? "Edit Tray"
              : "View Tray"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Create a new location tray"
              : mode === "edit" || isEditing
              ? "Update tray details"
              : "View tray information"}
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
          )}
        </div>
      </div>
      {isLoading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Loading tray details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              <FormInput
                label="Tray Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="Enter tray name"
                required
                disabled={mode === "view" && !isEditing}
              />

              <FormTextarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                error={errors.description}
                placeholder="Enter tray description (optional)"
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
