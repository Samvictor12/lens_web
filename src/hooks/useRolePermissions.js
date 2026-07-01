// src/hooks/useRolePermissions.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/services/auth';
import { getRolePermissionsById } from '@/services/role';
import {
  permissionsToModuleActions,
  PERMISSION_CATALOG,
} from '../constants/role.constants';

export function useRolePermissions(enabled = true) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchPermissions = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const user = getCurrentUser();
    
    // If no user or no role, clear and stop
    if (!user || (!user.role_id && !user.roleId && !user.roleName)) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    // Bypass check: Admin automatically has full permissions
    const roleName = user.roleName || (user.role && user.role.name) || '';
    const roleId = user.role_id || user.roleId;

    if (roleName.toLowerCase() === 'admin' || String(roleId) === '1') {
      const fullPerms = PERMISSION_CATALOG.map((p) => {
        const allTrue = {};
        Object.keys(p.actions).forEach((k) => {
          allTrue[k] = true;
        });
        return { ...p, actions: allTrue };
      });
      setPermissions(fullPerms);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getRolePermissionsById(roleId);
      const list = Array.isArray(response.permissions) ? response.permissions : [];
      setPermissions(list);
    } catch (err) {
      const message = err?.message || 'Failed to load permissions';
      setError(message);
      setPermissions([]);
      toast({
        title: 'Permission Warning',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [enabled, toast]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const moduleActions = useMemo(
    () => permissionsToModuleActions(permissions),
    [permissions]
  );

  const has = useCallback(
    (key, action = 'Screen') => {
      // Admin bypass
      const user = getCurrentUser();
      const roleName = user?.roleName || (user?.role && user?.role.name) || '';
      const roleId = user?.role_id || user?.roleId;
      if (roleName.toLowerCase() === 'admin' || String(roleId) === '1') {
        return true;
      }
      return moduleActions[key]?.[action] === true;
    },
    [moduleActions]
  );

  return {
    permissions,
    moduleActions,
    loading,
    error,
    refetch: fetchPermissions,
    has,
  };
}

export default useRolePermissions;
