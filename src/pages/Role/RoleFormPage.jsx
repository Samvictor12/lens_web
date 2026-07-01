import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { createRole, updateRole, getRoleById, deleteRoles } from '@/services/role';
import {
  initialRoleData,
  mergePermissions,
  ROLE_REDIRECT_URL,
} from '../../constants/role.constants';

export default function RoleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const getMode = useCallback(() => {
    if (location.pathname.includes('/create')) return 'create';
    if (location.pathname.includes('/edit/')) return 'edit';
    return 'view';
  }, [location.pathname]);

  const mode = getMode();
  const isView = mode === 'view';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState({ ...initialRoleData });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!id || isCreate) return;

    const loadRole = async () => {
      setLoading(true);
      try {
        const role = await getRoleById(id);
        setFormData({
          name: role.name ?? '',
          description: role.description ?? '',
          active_status: role.active_status ?? true,
          permissions: mergePermissions(role.permissions ?? []),
        });
        document.title = `${mode === 'edit' ? 'Edit' : 'View'} Role`;
      } catch (err) {
        toast({
          title: 'Error Loading Role',
          description: err.message || 'Failed to load role details',
          variant: 'destructive',
        });
        navigate(ROLE_REDIRECT_URL);
      } finally {
        setLoading(false);
      }
    };

    loadRole();
  }, [id, isCreate, mode, navigate, toast]);

  useEffect(() => {
    if (isCreate) {
      document.title = 'Create Role';
      setFormData({ ...initialRoleData });
    }
  }, [isCreate]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePermissionChange = (permKey, action, checked) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) =>
        p.key === permKey ? { ...p, actions: { ...p.actions, [action]: checked } } : p
      ),
    }));
  };

  const handleToggleAll = (permKey, checked) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) => {
        if (p.key !== permKey) return p;
        const toggled = {};
        Object.keys(p.actions).forEach((a) => {
          toggled[a] = checked;
        });
        return { ...p, actions: toggled };
      }),
    }));
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        role_name: formData.name.trim(),
        role_description: formData.description?.trim() || null,
        permissions: formData.permissions,
        active_status: formData.active_status,
      };

      if (isCreate) {
        await createRole(payload);
        toast({ title: 'Success', description: 'Role created successfully' });
      } else {
        await updateRole(id, payload);
        toast({ title: 'Success', description: 'Role updated successfully' });
      }
      navigate(ROLE_REDIRECT_URL);
    } catch (err) {
      toast({
        title: 'Error Saving Role',
        description: err.message || 'Failed to save role data',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this role? This cannot be undone.')) return;
    try {
      await deleteRoles([id]);
      toast({ title: 'Success', description: 'Role deleted successfully' });
      navigate(ROLE_REDIRECT_URL);
    } catch (err) {
      toast({
        title: 'Error Deleting Role',
        description: err.message || 'Failed to delete role',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4 w-full mx-auto overflow-y-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            {isCreate ? 'Add New Role' : isView ? 'Role Details' : 'Edit Role'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isCreate
              ? 'Fill in the role information and permissions below'
              : isView
                ? 'View role details and permission privileges'
                : 'Update role details and permissions'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-8 gap-1.5"
            onClick={() => navigate(ROLE_REDIRECT_URL)}
            disabled={saving}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>

          {isView && id !== '1' && (
            <Button
              size="xs"
              className="h-8 gap-1.5"
              onClick={() => navigate(`${ROLE_REDIRECT_URL}/edit/${id}`)}
            >
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}

          {!isCreate && !isView && id !== '1' && (
            <Button
              variant="destructive"
              size="xs"
              className="h-8 gap-1.5"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}

          {!isView && (
            <Button
              type="submit"
              size="xs"
              className="h-8 gap-1.5"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {isCreate ? 'Save Changes' : 'Update Changes'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Role Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Role Details</CardTitle>
            <CardDescription className="text-xs">General identifiers for the access role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="role_name">Role Name</Label>
                <Input
                  id="role_name"
                  value={formData.name}
                  disabled={isView || id === '1'}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, name: e.target.value }));
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g. Accounts Supervisor"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="flex flex-col gap-1.5 justify-end">
                <Label>Active Status</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="role_status"
                    checked={formData.active_status}
                    disabled={isView || id === '1'}
                    onCheckedChange={(val) => setFormData((p) => ({ ...p, active_status: val }))}
                  />
                  <Label htmlFor="role_status" className="text-xs text-muted-foreground font-normal">
                    {formData.active_status ? 'Active (allowed login)' : 'Inactive (disabled login)'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="role_description">Description</Label>
              <textarea
                id="role_description"
                value={formData.description}
                disabled={isView || id === '1'}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Describe what resources and features members of this role are allowed to access..."
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Module Permissions Matrix Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Module Permissions</CardTitle>
            <CardDescription className="text-xs">
              Toggle specific action capabilities for each application module below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.permissions.map((perm) => {
              const allEnabled = Object.values(perm.actions).every(Boolean);

              return (
                <div key={perm.key} className="rounded-lg border bg-card text-card-foreground p-3.5 space-y-3 shadow-xs">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-semibold text-sm text-foreground">{perm.label}</h4>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`all-${perm.key}`} className="text-xs text-muted-foreground font-normal">
                        Enable All
                      </Label>
                      <Switch
                        id={`all-${perm.key}`}
                        checked={allEnabled}
                        disabled={isView || id === '1'}
                        onCheckedChange={(val) => handleToggleAll(perm.key, val)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {Object.entries(perm.actions).map(([action, value]) => (
                      <div
                        key={action}
                        className="flex items-center space-x-2 bg-muted/40 px-2.5 py-1.5 rounded-md border border-border/50"
                      >
                        <Switch
                          id={`switch-${perm.key}-${action}`}
                          checked={!!value}
                          disabled={isView || id === '1'}
                          onCheckedChange={(val) => handlePermissionChange(perm.key, action, val)}
                        />
                        <Label htmlFor={`switch-${perm.key}-${action}`} className="text-xs cursor-pointer select-none font-medium text-muted-foreground">
                          {action}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
