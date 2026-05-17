import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCompanySettings } from "@/services/settings";
import { useAuth } from "@/contexts/AuthContext";

const CompanyContext = createContext(undefined);

/**
 * Dynamically updates the browser favicon to match the company logo.
 * Falls back gracefully if no logo is set.
 */
function applyFavicon(base64Logo) {
  try {
    // Try all common favicon selectors
    let link = document.querySelector("link[rel='icon']")
      || document.querySelector("link[rel='shortcut icon']");

    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    link.href = base64Logo || "/favicon.ico";
  } catch (e) {
    // Non-critical — silently ignore
  }
}

export const CompanyProvider = ({ children }) => {
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchCompany = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const response = await getCompanySettings();
      if (response.success) {
        setCompany(response.data);
        if (response.data?.logo) {
          applyFavicon(response.data.logo);
        }
      }
    } catch {
      // Company settings are non-critical — don't block the app
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Refresh company settings (call after saving company details)
  const refreshCompany = useCallback(async () => {
    await fetchCompany();
  }, [fetchCompany]);

  // Update local state immediately (optimistic update after save)
  const updateCompanyLocal = useCallback((data) => {
    setCompany(data);
    if (data?.logo) applyFavicon(data.logo);
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  return (
    <CompanyContext.Provider value={{ company, isLoading, refreshCompany, updateCompanyLocal }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
};
