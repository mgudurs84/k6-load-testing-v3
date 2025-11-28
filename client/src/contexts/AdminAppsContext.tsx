import { createContext, useContext, useState, ReactNode } from 'react';
import { HealthcareApp, ApiEndpoint } from '@shared/mock-data';
import { OpenApiSpec } from '@shared/openapi-types';

export interface AdminApp extends HealthcareApp {
  owner: string;
  openApiSpec: OpenApiSpec;
  isAdminConfigured: true;
}

export interface AdminAppWithApis {
  app: AdminApp;
  apis: ApiEndpoint[];
}

interface AdminAppsContextType {
  adminApps: AdminAppWithApis[];
  addAdminApp: (app: AdminAppWithApis) => void;
  removeAdminApp: (appId: string) => void;
  updateAdminApp: (appId: string, app: AdminAppWithApis) => void;
  getAdminAppById: (appId: string) => AdminAppWithApis | undefined;
}

const AdminAppsContext = createContext<AdminAppsContextType | undefined>(undefined);

export function AdminAppsProvider({ children }: { children: ReactNode }) {
  const [adminApps, setAdminApps] = useState<AdminAppWithApis[]>([]);

  const addAdminApp = (appWithApis: AdminAppWithApis) => {
    setAdminApps((prev) => [...prev, appWithApis]);
  };

  const removeAdminApp = (appId: string) => {
    setAdminApps((prev) => prev.filter((item) => item.app.id !== appId));
  };

  const updateAdminApp = (appId: string, updatedApp: AdminAppWithApis) => {
    setAdminApps((prev) =>
      prev.map((item) => (item.app.id === appId ? updatedApp : item))
    );
  };

  const getAdminAppById = (appId: string) => {
    return adminApps.find((item) => item.app.id === appId);
  };

  return (
    <AdminAppsContext.Provider
      value={{
        adminApps,
        addAdminApp,
        removeAdminApp,
        updateAdminApp,
        getAdminAppById,
      }}
    >
      {children}
    </AdminAppsContext.Provider>
  );
}

export function useAdminApps() {
  const context = useContext(AdminAppsContext);
  if (context === undefined) {
    throw new Error('useAdminApps must be used within an AdminAppsProvider');
  }
  return context;
}
