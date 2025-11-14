import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  createUser,
  getUserById,
  updateUser,
  generateUserCode,
} from "@/services/user";
import { getDepartmentDropdown } from "@/services/department";
import {
  defaultUser,
  activeStatusOptions,
  bloodGroupOptions,
  roleOptions,
} from "./User.constants";

export default function UserForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultUser);
  const [originalData, setOriginalData] = useState(defaultUser);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [departments, setDepartments] = useState([]);

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await getDepartmentDropdown();
        if (response.success) {
          setDepartments(response.data);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
        toast({
          title: "Warning",
          description: "Failed to load departments",
          variant: "destructive",
        });
      }
    };

    fetchDepartments();
  }, []);

  // Auto-generate user code for new users
  useEffect(() => {
    const fetchUserCode = async () => {
      if (mode === "add" && !formData.usercode) {
        try {
          const response = await generateUserCode();
          if (response.success) {
            setFormData((prev) => ({
              ...prev,
              usercode: response.data.usercode,
            }));
          }
        } catch (error) {
          console.error("Error generating user code:", error);
        }
      }
    };

    fetchUserCode();
  }, [mode]);

  useEffect(() => {
    const fetchUser = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getUserById(parseInt(id));

          if (response.success) {
            const user = response.data;
            const userData = {
              name: user.name || "",
              usercode: user.usercode || "",
              email: user.email || "",
              phonenumber: user.phonenumber || "",
              alternatenumber: user.alternatenumber || "",
              bloodgroup: user.bloodgroup || null,
              address: user.address || "",
              city: user.city || "",
              state: user.state || "",
              pincode: user.pincode || "",
              roleId: user.role_id || null,
              departmentId: user.department_id || null,
              salary: user.salary || "",
              activeStatus:
                user.active_status !== undefined ? user.active_status : true,
            };
            setFormData(userData);
            setOriginalData(userData);
          } else {
            toast({
              title: "Error",
              description: "User not found",
              variant: "destructive",
            });
            navigate("/masters/users");
          }
        } catch (error) {
          console.error("Error fetching user:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch user details",
            variant: "destructive",
          });
          navigate("/masters/users");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchUser();
  }, [id, mode, navigate]);

  const validatePhone = (phone) => {
    if (!phone) return true; // Phone is optional
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length === 10;
  };

  const validateEmail = (email) => {
    if (!email) return false; // Email is required
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation (required)
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // User Code validation (required)
    if (!formData.usercode.trim()) {
      newErrors.usercode = "User code is required";
    }

    // Email validation (required)
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Phone validation
    if (formData.phonenumber && !validatePhone(formData.phonenumber)) {
      newErrors.phonenumber = "Phone number must be exactly 10 digits";
    }

    // Alternate phone validation
    if (formData.alternatenumber && !validatePhone(formData.alternatenumber)) {
      newErrors.alternatenumber = "Alternate phone must be exactly 10 digits";
    }

    // Salary validation
    if (
      formData.salary &&
      (isNaN(formData.salary) || parseFloat(formData.salary) < 0)
    ) {
      newErrors.salary = "Salary must be a valid positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle phone numbers - allow only digits
    if (name === "phonenumber") {
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length <= 10) {
        setFormData((prev) => ({ ...prev, [name]: cleaned }));
      }
    }
    if (name === "alternatenumber") {
      const cleaned = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
    }
    // Handle salary - allow only numbers
    else if (name === "salary") {
      if (value === "" || (!isNaN(value) && parseFloat(value) >= 0)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
    // Handle pincode - allow only digits up to 6
    else if (name === "pincode") {
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length <= 6) {
        setFormData((prev) => ({ ...prev, [name]: cleaned }));
      }
    }
    // Handle all other fields normally
    else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

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
        // Create new user
        const response = await createUser(formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "User added successfully!",
          });
          navigate("/masters/users");
        }
      } else if (mode === "edit" || isEditing) {
        // Update existing user
        const response = await updateUser(parseInt(id), formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "User updated successfully!",
          });

          // if (mode === "view") {
            // Update local data and exit edit mode
            setOriginalData(formData);
            setIsEditing(false);
          // } else {
            navigate("/masters/users");
          // }
        }
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/users");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        // Reset to original data and exit edit mode
        setFormData(originalData);
        setIsEditing(false);
        setErrors({});
        navigate("/masters/users");
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
              ? "Add New User"
              : mode === "edit"
              ? "Edit User"
              : "User Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the user information below"
              : mode === "edit"
              ? "Update user information"
              : "View user information"}
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
                Loading user details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              {/* Row 1: Name, User Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* <FormInput
                  label="User Code"
                  name="usercode"
                  value={formData.usercode}
                  onChange={handleChange}
                  disabled={true} // Always disabled - auto-generated
                  required
                  error={errors.usercode}
                /> */}
                <FormInput
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                  error={errors.name}
                />
              </div>

              {/* Row 2: Email, Phone Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Email Address"
                  name="email"
                  type="email"
                  prefix="@"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                  error={errors.email}
                />
                <FormInput
                  label="Phone Number (Optional)"
                  name="phonenumber"
                  type="tel"
                  prefix="+91"
                  value={formData.phonenumber}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  maxLength={10}
                  error={errors.phonenumber}
                />
              </div>

              {/* Row 3: Alternate Number, Blood Group */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Alternate Number"
                  name="alternatenumber"
                  value={formData.alternatenumber}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  //   maxLength={10}
                  error={errors.alternatenumber}
                />
                <FormSelect
                  label="Blood Group"
                  name="bloodgroup"
                  options={bloodGroupOptions.map((opt) => ({
                    id: opt.value,
                    name: opt.label,
                  }))}
                  value={formData.bloodgroup}
                  onChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      bloodgroup: value,
                    }));
                    if (errors.bloodgroup) {
                      setErrors((prev) => ({ ...prev, bloodgroup: "" }));
                    }
                  }}
                  placeholder="Select blood group"
                  isSearchable={false}
                  isClearable={true}
                  disabled={isReadOnly}
                  error={errors.bloodgroup}
                />
              </div>

              {/* Row 4: Department, Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormSelect
                  label="Department"
                  name="departmentId"
                  options={departments}
                  value={formData.departmentId}
                  onChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      departmentId: value,
                    }));
                    if (errors.departmentId) {
                      setErrors((prev) => ({ ...prev, departmentId: "" }));
                    }
                  }}
                  placeholder="Select department"
                  isSearchable={true}
                  isClearable={true}
                  disabled={isReadOnly}
                  error={errors.departmentId}
                />
                <FormSelect
                  label="Role"
                  name="roleId"
                  options={roleOptions}
                  value={formData.roleId}
                  onChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      roleId: value,
                    }));
                    if (errors.roleId) {
                      setErrors((prev) => ({ ...prev, roleId: "" }));
                    }
                  }}
                  placeholder="Select role"
                  isSearchable={false}
                  isClearable={true}
                  disabled={isReadOnly}
                  error={errors.roleId}
                />
              </div>

              {/* Row 5: Salary, Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Salary"
                  name="salary"
                  type="number"
                  min="0"
                  step="1000"
                  prefix="₹"
                  value={formData.salary}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  error={errors.salary}
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
              </div>

              {/* Row 6: Address */}
              <FormTextarea
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={2}
                error={errors.address}
              />

              {/* Row 7: City, State, Pincode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  error={errors.city}
                />
                <FormInput
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  error={errors.state}
                />
                <FormInput
                  label="Pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  maxLength={6}
                  error={errors.pincode}
                />
              </div>

              {/* Info Alert */}
              {mode === "add" && (
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription className="text-xs">
                    Fields marked with{" "}
                    <span className="text-destructive">*</span> are required.
                    Login credentials will be set separately using the Login
                    Settings button.
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
