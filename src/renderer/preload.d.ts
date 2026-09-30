// This file provides TypeScript types for the API exposed by the preload script.
// It is referenced in tsconfig.json to make these types globally available
// in your React components.

/// <reference types="vite/client" />

declare global {
    interface Window {
        electronAPI: {
            login: () => Promise<any>;
            logout: () => Promise<void>;
            getToken: () => Promise<{ accessToken: string } | null>;
            getTokenForTenant: (tenantId: string) => Promise<{ accessToken: string } | null>;
            getCustomerDefaultNamespace: (tenantId: string) => Promise<{ namespace: string | null; error?: string }>;
            // FIX: Aligned the type with the other preload.d.ts to resolve conflicting global types.
            getAccount: () => Promise<{ name: string; tenantId: string; } | null>;
            loadDefaultRoles: () => Promise<string[] | null>;
            saveDefaultRoles: (roleIds: string[]) => Promise<{ success: boolean; error?: string }>;
            resetDefaultRoles: () => Promise<{ success: boolean; error?: string }>;
            loadRolePresets: () => Promise<Record<string, string[]>>;
            saveRolePreset: (name: string, roleIds: string[]) => Promise<{ success: boolean; presets?: Record<string, string[]>; persistedToSource?: boolean; error?: string }>;
            deleteRolePreset: (name: string) => Promise<{ success: boolean; presets?: Record<string, string[]>; error?: string }>;
            loadRemovedBuiltInTemplates: () => Promise<string[]>;
            deleteBuiltInTemplate: (name: string) => Promise<{ success: boolean; removedTemplates?: string[]; removedFromAppConfig?: boolean; error?: string }>;
            selectSecurityMatrixCsvExportPath: (defaultFileName: string) => Promise<{ canceled: true } | { canceled: false; filePath: string }>;
            saveSecurityMatrixCsv: (filePath: string, csvContent: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
        }
    }
}

// Adding this empty export statement turns this file into a module, which is required
// for declaring globals in a way that TypeScript understands across the project.
export {};
