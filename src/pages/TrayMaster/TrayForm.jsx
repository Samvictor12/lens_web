import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createTray, getTrayById, updateTray } from "../../services/tray";
import { getLocationDropdown } from "../../services/location";
import { defaultTray, activeStatusOptions } from "./Tray.constants";

export default function TrayForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultTray);
  const [originalData, setOriginalData] = useState(defaultTray);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const locationRes = await getLocationDropdown();
        if (locationRes.success) {
          setLocations(locationRes.data);
        }
      } catch (error) {
        console.error("Error fetching dropdowns:", error);
      }
    };

    fetchDropdowns();
  }, []);

  useEffect(() => {
    const fetchTray = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getTrayById(parseInt(id));

          if (response.success) {
            const tray = response.data;
            const trayData = {
              name: tray.name || "",
              trayCode: tray.trayCode || "",
              description: tray.description || "",
              capacity: tray.capacity || 0,
              locationId: tray.locationId || null,
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
            navigate("/masters/tray");
          }
        } catch (error) {
          console.error("Error fetching tray:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch tray details",
            variant: "destructive",
          });
          navigate("/masters/tray");
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

    if (!formData.trayCode.trim()) {
      newErrors.trayCode = "Tray code is required";
    }

    if (formData.capacity < 0) {
      newErrors.capacity = "Capacity cannot be negative";
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
        const response = await createTray(formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Tray added successfully!",
          });
          navigate("/masters/tray");
        }
      } else if (mode === "edit" || isEditing) {
        const response = await updateTray(parseInt(id), formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Tray updated successfully!",
          });

          setOriginalData(formData);
          setIsEditing(false);
          navigate("/masters/tray");
        }
      }
    } catch (error) {
      console.error("Error saving tray:", error);
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
      navigate("/masters/tray");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        setFormData(originalData);
        setErrors({});
        setIsEditing(false);
        navigate("/masters/tray");
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
              ? "Add Tray"
              : mode === "edit" || isEditing
              ? "Edit Tray"
              : "View Tray"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Create a new storage tray"
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
                Loading tray details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <FormInput
                  label="Tray Code"
                  name="trayCode"
                  value={formData.trayCode}
                  onChange={handleChange}
                  error={errors.trayCode}
                  placeholder="Enter tray code (e.g., TRAY-001)"
                  required
                  disabled={mode === "view" && !isEditing}
                />

                <FormInput
                  label="Capacity"
                  name="capacity"
                  type="number"
                  min="0"
                  value={formData.capacity}
                  onChange={handleChange}
                  error={errors.capacity}
                  placeholder="Enter capacity"
                  disabled={mode === "view" && !isEditing}
                />

                <FormSelect
                  label="Location"
                  name="locationId"
                  options={locations}
                  value={formData.locationId}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, locationId: value }));
                  }}
                  placeholder="Select location (optional)"
                  disabled={mode === "view" && !isEditing}
                  isSearchable={true}
                  isClearable={true}
                />
              </div>

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
