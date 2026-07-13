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
  createLensDia,
  getLensDiaById,
  updateLensDia,
} from "../../services/lensDia";
import { defaultLensDia, activeStatusOptions } from "./LensDia.constants";

export default function LensDiaForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultLensDia);
  const [originalData, setOriginalData] = useState(defaultLensDia);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchDia = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getLensDiaById(parseInt(id));

          if (response.success) {
            const dia = response.data;
            const diaData = {
              name: dia.name ?? "",
              description: dia.description || "",
              activeStatus:
                dia.activeStatus !== undefined ? dia.activeStatus : true,
            };
            setFormData(diaData);
            setOriginalData(diaData);
          } else {
            toast({
              title: "Error",
              description: "Lens diameter not found",
              variant: "destructive",
            });
            navigate("/masters/lens-dia");
          }
        } catch (error) {
          console.error("Error fetching lens diameter:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch lens diameter details",
            variant: "destructive",
          });
          navigate("/masters/lens-dia");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchDia();
  }, [id, mode, navigate]);

  const validateForm = () => {
    const newErrors = {};
    const num = Number(formData.name);
    if (formData.name === "" || formData.name === null || formData.name === undefined) {
      newErrors.name = "Diameter is required";
    } else if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      newErrors.name = "Diameter must be a positive whole number";
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

    if (!validateForm()) return;

    try {
      setIsSaving(true);

      if (mode === "add") {
        const response = await createLensDia(formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Lens diameter added successfully!",
          });
          navigate("/masters/lens-dia");
        }
      } else if (mode === "edit" || isEditing) {
        const response = await updateLensDia(parseInt(id), formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Lens diameter updated successfully!",
          });
          setOriginalData(formData);
          setIsEditing(false);
          navigate("/masters/lens-dia");
        }
      }
    } catch (error) {
      console.error("Error saving lens diameter:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save lens diameter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/lens-dia");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        setFormData(originalData);
        setIsEditing(false);
        setErrors({});
        navigate("/masters/lens-dia");
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

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            {mode === "add"
              ? "Add New Lens Diameter"
              : mode === "edit"
              ? "Edit Lens Diameter"
              : "Lens Diameter Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the lens diameter information below"
              : mode === "edit"
              ? "Update lens diameter information"
              : "View lens diameter information"}
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
                Loading lens diameter details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormInput
                  label="Diameter"
                  name="name"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                  error={errors.name}
                  helperText={!errors.name && "Enter diameter as a whole number, e.g. 65, 70, 75"}
                />

                <FormSelect
                  label="Status"
                  name="activeStatus"
                  options={activeStatusOptions.map((opt) => ({
                    id: opt.value,
                    name: opt.label,
                  }))}
                  value={formData.activeStatus}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, activeStatus: value }));
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
              </div>

              <FormTextarea
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={3}
                placeholder="Enter a brief description of this diameter"
              />

              {mode === "add" && (
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription className="text-xs">
                    Fields marked with{" "}
                    <span className="text-red-500">*</span> are required.
                    This diameter will be available in sale orders and purchase orders.
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
