import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  createExpenseCategory,
  getExpenseCategoryById,
  updateExpenseCategory,
} from "@/services/expense";
import {
  defaultExpenseCategory,
  activeStatusOptions,
  expenseTypeOptions,
} from "./ExpenseCategory.constants";

export default function ExpenseCategoryForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultExpenseCategory);
  const [originalData, setOriginalData] = useState(defaultExpenseCategory);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expenseCount, setExpenseCount] = useState(0);
  const [linkedLedger, setLinkedLedger] = useState(null);

  useEffect(() => {
    const fetchCategory = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getExpenseCategoryById(parseInt(id));

          if (response.success) {
            const category = response.data;
            const categoryData = {
              name: category.name || "",
              expenseType: category.expenseType || "INDIRECT",
              activeStatus:
                category.active_status !== undefined
                  ? category.active_status
                  : true,
            };
            setFormData(categoryData);
            setOriginalData(categoryData);
            setExpenseCount(category._count?.expenses || 0);
            setLinkedLedger(category.ledger || null);
          } else {
            toast({
              title: "Error",
              description: "Expense category not found",
              variant: "destructive",
            });
            navigate("/masters/expense-categories");
          }
        } catch (error) {
          console.error("Error fetching category:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch category details",
            variant: "destructive",
          });
          navigate("/masters/expense-categories");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchCategory();
  }, [id, mode, navigate]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
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
        const response = await createExpenseCategory(formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Expense category added successfully!",
          });
          navigate("/masters/expense-categories");
        }
      } else if (mode === "edit" || isEditing) {
        const response = await updateExpenseCategory(parseInt(id), formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Expense category updated successfully!",
          });
          setOriginalData(formData);
          setIsEditing(false);
          navigate("/masters/expense-categories");
        }
      }
    } catch (error) {
      console.error("Error saving category:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to save expense category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/expense-categories");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        setFormData(originalData);
        setIsEditing(false);
        setErrors({});
        navigate("/masters/expense-categories");
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
              ? "Add New Expense Category"
              : mode === "edit"
              ? "Edit Expense Category"
              : "Expense Category Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the category information below"
              : mode === "edit"
              ? "Update category information"
              : expenseCount > 0
              ? `${expenseCount} ${
                  expenseCount === 1 ? "expense" : "expenses"
                } using this category`
              : "View category information"}
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
                Loading category details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              <FormInput
                label="Category Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isReadOnly}
                required
                error={errors.name}
              />

              <FormSelect
                label="Classification"
                name="expenseType"
                options={expenseTypeOptions.map((opt) => ({
                  id: opt.value,
                  name: opt.label,
                }))}
                value={formData.expenseType}
                onChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    expenseType: value,
                  }));
                }}
                placeholder="Select classification"
                isSearchable={false}
                isClearable={false}
                disabled={isReadOnly}
                required
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
                  setFormData((prev) => ({
                    ...prev,
                    activeStatus: value,
                  }));
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

              {linkedLedger && (
                <FormInput
                  label="Linked Ledger"
                  name="ledger"
                  value={`${linkedLedger.ledgerCode} — ${linkedLedger.ledgerName}`}
                  disabled
                />
              )}

              {mode === "add" && (
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription className="text-xs">
                    Fields marked with{" "}
                    <span className="text-red-500">*</span> are required.
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
