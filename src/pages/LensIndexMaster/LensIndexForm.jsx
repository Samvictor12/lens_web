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
  createLensIndex,
  getLensIndexById,
  updateLensIndex,
} from "../../services/lensIndex";
import { defaultLensIndex, activeStatusOptions } from "./LensIndex.constants";

export default function LensIndexForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultLensIndex);
  const [originalData, setOriginalData] = useState(defaultLensIndex);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchIndex = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getLensIndexById(parseInt(id));

          if (response.success) {
            const index = response.data;
            const indexData = {
              indexName: index.indexName || "",
              description: index.description || "",
              activeStatus: index.activeStatus !== undefined ? index.activeStatus : true,
            };
            setFormData(indexData);
            setOriginalData(indexData);
          } else {
            toast({
              title: "Error",
              description: "Lens index not found",
              variant: "destructive",
            });
            navigate("/masters/lens-index");
          }
        } catch (error) {
          console.error("Error fetching lens index:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch lens index details",
            variant: "destructive",
          });
          navigate("/masters/lens-index");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchIndex();
  }, [id, mode, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.indexName.trim()) {
      newErrors.indexName = "Index name is required";
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
        const response = await createLensIndex(formData);
        if (response.success) {
          toast({ title: "Success", description: "Lens index added successfully!" });
          navigate("/masters/lens-index");
        }
      } else if (mode === "edit" || isEditing) {
        const response = await updateLensIndex(parseInt(id), formData);
        if (response.success) {
          toast({ title: "Success", description: "Lens index updated successfully!" });
          setOriginalData(formData);
          setIsEditing(false);
          navigate("/masters/lens-index");
        }
      }
    } catch (error) {
      console.error("Error saving lens index:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save lens index. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/lens-index");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        setFormData(originalData);
        setIsEditing(false);
        setErrors({});
        navigate("/masters/lens-index");
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
              ? "Add New Lens Index"
              : mode === "edit"
              ? "Edit Lens Index"
              : "Lens Index Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the lens index information below"
              : mode === "edit"
              ? "Update lens index information"
              : "View lens index information"}
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
              <p className="text-sm text-muted-foreground">Loading lens index details...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              <FormInput
                label="Index Name"
                name="indexName"
                value={formData.indexName}
                onChange={handleChange}
                error={errors.indexName}
                disabled={isReadOnly}
                placeholder='e.g. 1.56, 1.61, 1.67'
                required
              />
              <FormTextarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isReadOnly}
                placeholder="Optional description"
              />
              <FormSelect
                label="Status"
                name="activeStatus"
                options={activeStatusOptions}
                value={formData.activeStatus}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, activeStatus: value }))
                }
                disabled={isReadOnly}
                isSearchable={false}
              />
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
