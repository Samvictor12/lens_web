import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  createDepartment,
  getDepartmentById,
  updateDepartment,
} from "@/services/department";
import {
  defaultDepartment,
  activeStatusOptions,
} from "./Department.constants";

export default function DepartmentForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultDepartment);
  const [originalData, setOriginalData] = useState(defaultDepartment);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    const fetchDepartment = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getDepartmentById(parseInt(id));

          if (response.success) {
            const department = response.data;
            const departmentData = {
              department: department.department || "",
              activeStatus:
                department.active_status !== undefined
                  ? department.active_status
                  : true,
            };
            setFormData(departmentData);
            setOriginalData(departmentData);
            setUserCount(department._count?.Users || 0);
          } else {
            toast({
              title: "Error",
              description: "Department not found",
              variant: "destructive",
            });
            navigate("/masters/departments");
          }
        } catch (error) {
          console.error("Error fetching department:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch department details",
            variant: "destructive",
          });
          navigate("/masters/departments");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchDepartment();
  }, [id, mode, navigate]);

  const validateForm = () => {
    const newErrors = {};

    // Department name validation (required)
    if (!formData.department.trim()) {
      newErrors.department = "Department name is required";
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
        // Create new department
        const response = await createDepartment(formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Department added successfully!",
          });
          navigate("/masters/departments");
        }
      } else if (mode === "edit" || isEditing) {
        // Update existing department
        const response = await updateDepartment(parseInt(id), formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Department updated successfully!",
          });

          if (mode === "view") {
            // Update local data and exit edit mode
            setOriginalData(formData);
            setIsEditing(false);
          } else {
            navigate("/masters/departments");
          }
        }
      }
    } catch (error) {
      console.error("Error saving department:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save department. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/departments");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        // Reset to original data and exit edit mode
        setFormData(originalData);
        setIsEditing(false);
        setErrors({});
        navigate("/masters/departments");
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
              ? "Add New Department"
              : mode === "edit"
              ? "Edit Department"
              : "Department Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the department information below"
              : mode === "edit"
              ? "Update department information"
              : userCount > 0
              ? `${userCount} ${userCount === 1 ? "user" : "users"} in this department`
              : "View department information"}
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
                Loading department details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              {/* Department Name */}
              <FormInput
                label="Department Name"
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={isReadOnly}
                required
                error={errors.department}
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
