// src/contexts/RolePermissionsContext.jsx
import React, { createContext, useContext } from 'react';
import { useRolePermissions } from '../hooks/useRolePermissions';

const RolePermissionsContext = createContext(null);

export const RolePermissionsProvider = ({ children, enabled = true }) => {
  const value = useRolePermissions(enabled);

  return (
    <RolePermissionsContext.Provider value={value}>
      {children}
    </RolePermissionsContext.Provider>
  );
};

export function useRolePermissionsContext() {
  const ctx = useContext(RolePermissionsContext);
  if (!ctx) {
    throw new Error('useRolePermissionsContext must be used within RolePermissionsProvider');
  }
  return ctx;
}

export function useRolePermissionsContextOptional() {
  return useContext(RolePermissionsContext);
}

export default RolePermissionsContext;
