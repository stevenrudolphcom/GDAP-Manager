import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DelegatedAdminRelationship, DelegatedAdminAccessAssignment, UnifiedRole, SecurityGroupSearchResult } from '../types';
import {
    getGDAPAssignmentsWithGroupDisplayNames,
    getGDAPSingleAccessAssignment,
    createGDAPAccessAssignment,
    updateGDAPAccessAssignment,
    deleteGDAPAccessAssignment,
    updateGDAPRelationshipAutoExtend,
    getTenantOnMicrosoftDomain,
    searchSecurityGroups
} from '../services/graphService';
import { AZURE_AD_ROLES, GROUP_TEMPLATES, DEFAULT_ROLE_IDS } from '../constants';
import RoleSelector from './RoleSelector';
import { useDebounce } from '../hooks/useDebounce';
import SpinnerIcon from './icons/SpinnerIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import TrashIcon from './icons/TrashIcon';
import SearchIcon from './icons/SearchIcon';

interface AssignmentEditorProps {
    relationship: DelegatedAdminRelationship | null;
    getAccessToken?: () => Promise<string>;
    onUpdateRelationship: (relationship: DelegatedAdminRelationship) => void;
    onAssignmentsLoaded?: (relationshipId: string, count: number, groupNames?: string[], assignments?: DelegatedAdminAccessAssignment[]) => void;
    allRelationshipGroupNames?: Record<string, string[]>;
    initialEditingAssignmentId?: string | null;
    onBackToGroupOverview?: () => void;
}

const defaultGetAccessToken = async (): Promise<string> => {
    const response = await window.electronAPI.getToken();
    if (!response?.accessToken) {
        throw new Error('Failed to get access token.');
    }
    return response.accessToken;
};

const getGroupBaseName = (displayName: string): string => {
    const m = displayName.match(/^(.*?)(-[A-Z]{1,4})$/i);
    return m ? m[1] : displayName;
};

const belongsToFamily = (groupName: string, family: string): boolean => {
    return groupName === family || groupName.startsWith(`${family}-`);
};

const extractRelationshipSuffix = (relationshipName: string): string | null => {
    const m = relationshipName.match(/-([A-Za-z0-9]{1,8})$/);
    return m ? m[1].toUpperCase() : null;
};

/**
 * Microsoft's three built-in standard agent security groups that exist in every
 * CSP partner tenant by default. They are created automatically by the Partner Center
 * and are used to grant delegated admin privileges to partner users.
 *
 * - AdminAgents: Full admin access; previously mapped via DAP as Global Admin.
 * - HelpdeskAgents: Helpdesk-level access; previously mapped via DAP as Helpdesk Admin.
 * - SalesAgents: Sales/account management access; no direct tenant admin access.
 *
 * References:
 *   https://learn.microsoft.com/en-us/partner-center/gdap-assign-azure-ad-roles
 *   https://learn.microsoft.com/en-us/partner-center/permissions-overview
 */
const MICROSOFT_STANDARD_AGENT_GROUPS = ['AdminAgents', 'HelpdeskAgents', 'SalesAgents'] as const;
const MICROSOFT_STANDARD_AGENT_GROUPS_LOWER = new Set(MICROSOFT_STANDARD_AGENT_GROUPS.map(g => g.toLowerCase()));

const buildTemplateColor = (templateKey: string): string => {
    let hash = 0;
    for (let i = 0; i < templateKey.length; i += 1) {
        hash = templateKey.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 68%, 48%)`;
};

const CopyToClipboard: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0" title="Copy Group ID">
            {copied ? <ClipboardCheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4" />}
        </button>
    );
};

// Helper function to format date consistently as DD/MM/YYYY
const formatToDMY = (dateString: string | undefined): string => {
    if (!dateString) return 'Unknown';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
};

export const AssignmentForm: React.FC<{
    relationshipId: string;
    existingAssignment?: DelegatedAdminAccessAssignment | null;
    onSave: (savedAssignment?: DelegatedAdminAccessAssignment) => void;
    onCancel: () => void;
    getAccessToken?: () => Promise<string>;
    allowedRoleIds?: string[];
    usedSecurityGroupIds?: string[];
    prefillGroupDisplayName?: string;
}> = ({
    relationshipId,
    existingAssignment,
    onSave,
    onCancel,
    getAccessToken: propGetAccessToken,
    allowedRoleIds,
    usedSecurityGroupIds = [],
    prefillGroupDisplayName,
}) => {
    const getAccessToken = propGetAccessToken || defaultGetAccessToken;
    const [securityGroupId, setSecurityGroupId] = useState(existingAssignment?.accessContainer.accessContainerId || '');
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(existingAssignment?.accessDetails.unifiedRoles.map(r => r.roleDefinitionId) || []);
    const [userPresets, setUserPresets] = useState<Record<string, string[]>>({});
    const [isSavingPreset, setIsSavingPreset] = useState(false);
    const [presetNameInput, setPresetNameInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [templateWarning, setTemplateWarning] = useState<string | null>(null);
    const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);
    const [groupSearchTerm, setGroupSearchTerm] = useState(prefillGroupDisplayName || '');
    const [groupOptions, setGroupOptions] = useState<SecurityGroupSearchResult[]>([]);
    const [selectedGroupDisplayName, setSelectedGroupDisplayName] = useState<string | null>(
        existingAssignment?.accessContainer.displayName || null
    );
    const [isSearchingGroups, setIsSearchingGroups] = useState(false);
    const [groupSearchError, setGroupSearchError] = useState<string | null>(null);
    const [prefillSelectionApplied, setPrefillSelectionApplied] = useState(!prefillGroupDisplayName);
    const [prefillFallbackTried, setPrefillFallbackTried] = useState(false);
    const [lastCompletedSearchTerm, setLastCompletedSearchTerm] = useState<string | null>(null);

    const currentGroupName = selectedGroupDisplayName || existingAssignment?.accessContainer.displayName || groupSearchTerm || '';

    useEffect(() => {
        let isMounted = true;
        const loadPresets = async () => {
            try {
                const presets = await window.electronAPI.loadRolePresets();
                if (isMounted && presets) {
                    setUserPresets(presets);
                }
            } catch (err) {
                console.error('Failed to load role presets:', err);
            }
        };
        void loadPresets();
        return () => {
            isMounted = false;
        };
    }, []);

    // Merge built-in templates with user customizations into a unified template list
    const unifiedTemplates = useMemo(() => {
        const list: Array<{
            key: string;
            name: string;
            roleIds: string[];
            isBuiltIn: boolean;
            isCustomized: boolean;
            color: string;
        }> = [];

        const lowerUserPresetsMap = new Map<string, { originalKey: string; roleIds: string[] }>();
        Object.entries(userPresets).forEach(([k, v]) => {
            lowerUserPresetsMap.set(k.toLowerCase(), { originalKey: k, roleIds: v });
        });

        const handledUserKeys = new Set<string>();

        // 1. Built-in templates (overridden if present in userPresets)
        Object.entries(GROUP_TEMPLATES).forEach(([builtInKeyLower, template]) => {
            const userOverride =
                lowerUserPresetsMap.get(builtInKeyLower) ||
                lowerUserPresetsMap.get(template.name.toLowerCase());
            const hasOverride = !!userOverride;
            const roleIds = userOverride ? userOverride.roleIds : template.roleIds;
            if (userOverride) {
                handledUserKeys.add(userOverride.originalKey.toLowerCase());
            }

            list.push({
                key: template.name,
                name: template.name,
                roleIds,
                isBuiltIn: true,
                isCustomized: hasOverride,
                color: buildTemplateColor(template.name),
            });
        });

        // 2. Custom user presets not matching any built-in template
        Object.entries(userPresets).forEach(([presetName, roleIds]) => {
            if (!handledUserKeys.has(presetName.toLowerCase())) {
                list.push({
                    key: presetName,
                    name: presetName,
                    roleIds,
                    isBuiltIn: false,
                    isCustomized: true,
                    color: buildTemplateColor(presetName),
                });
            }
        });

        return list.sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
    }, [userPresets]);

    // Find the template that matches the current security group's name
    const matchingTemplateName = useMemo(() => {
        if (!currentGroupName || currentGroupName === 'Unnamed Group') return null;
        const normalized = currentGroupName.toLowerCase().trim();
        const base = getGroupBaseName(currentGroupName).toLowerCase().trim();

        // Check exact or base match against unified templates
        const exact = unifiedTemplates.find(
            (t) => t.name.toLowerCase() === normalized || t.name.toLowerCase() === base
        );
        if (exact) return exact.name;

        // Check substring/prefix match
        const substring = unifiedTemplates.find((t) => {
            const tLower = t.name.toLowerCase();
            return normalized.includes(tLower) || tLower.includes(base);
        });
        return substring ? substring.name : null;
    }, [currentGroupName, unifiedTemplates]);

    const activePresetTargetName = useMemo(() => {
        if (appliedTemplateName) return appliedTemplateName;
        const base = getGroupBaseName(currentGroupName);
        if (base && base !== 'Unnamed Group' && base.trim().length > 0) return base;
        return 'Default';
    }, [appliedTemplateName, currentGroupName]);

    const activeTemplate = useMemo(() => {
        return (
            unifiedTemplates.find((t) => t.name.toLowerCase() === activePresetTargetName.toLowerCase()) ||
            null
        );
    }, [unifiedTemplates, activePresetTargetName]);

    // Empty list (not null) so RoleSelector does not fall back to DEFAULT_ROLE_IDS when no preset exists
    const activePresetRoles = useMemo(() => {
        return activeTemplate ? activeTemplate.roleIds : [];
    }, [activeTemplate]);

    const handleSaveDefaults = async (roleIds: string[]) => {
        try {
            const targetName = activePresetTargetName;
            const res = await window.electronAPI.saveRolePreset(targetName, roleIds);
            if (res?.presets) {
                setUserPresets(res.presets);
            } else {
                setUserPresets(prev => ({ ...prev, [targetName]: roleIds }));
            }
            await window.electronAPI.saveDefaultRoles(roleIds);
            setAppliedTemplateName(targetName);
            setTemplateWarning(null);
        } catch (err: any) {
            console.error('Failed to save preset:', err);
            setTemplateWarning(err.message || 'Failed to save preset.');
        }
    };

    const handleResetDefaults = async () => {
        try {
            if (activeTemplate?.isBuiltIn && activeTemplate.isCustomized) {
                const res = await window.electronAPI.deleteRolePreset(activeTemplate.name);
                if (res?.presets) {
                    setUserPresets(res.presets);
                } else {
                    setUserPresets(prev => {
                        const next = { ...prev };
                        delete next[activeTemplate.name];
                        return next;
                    });
                }
                const originalTemplate = Object.values(GROUP_TEMPLATES).find(
                    t => t.name.toLowerCase() === activeTemplate.name.toLowerCase()
                );
                if (originalTemplate) {
                    applyRoleList(originalTemplate.name, originalTemplate.roleIds);
                }
            } else if (appliedTemplateName && userPresets[appliedTemplateName]) {
                const res = await window.electronAPI.deleteRolePreset(appliedTemplateName);
                if (res?.presets) {
                    setUserPresets(res.presets);
                } else {
                    setUserPresets(prev => {
                        const next = { ...prev };
                        delete next[appliedTemplateName];
                        return next;
                    });
                }
                await window.electronAPI.resetDefaultRoles();
                setSelectedRoleIds(DEFAULT_ROLE_IDS);
                setAppliedTemplateName(null);
            } else {
                await window.electronAPI.resetDefaultRoles();
                setSelectedRoleIds(DEFAULT_ROLE_IDS);
                setAppliedTemplateName(null);
            }
        } catch (err) {
            console.error('Failed to reset default roles:', err);
        }
    };

    const debouncedGroupSearchTerm = useDebounce(groupSearchTerm, 300);
    const sortedGroupOptions = useMemo(
        () =>
            [...groupOptions].sort((a, b) =>
                (a.displayName || '').localeCompare(b.displayName || '', 'de', { sensitivity: 'base' })
            ),
        [groupOptions]
    );
    const usedSecurityGroupIdSet = useMemo(() => new Set(usedSecurityGroupIds), [usedSecurityGroupIds]);

    useEffect(() => {
        if (existingAssignment) return;
        setGroupSearchTerm(prefillGroupDisplayName || '');
        setPrefillSelectionApplied(!prefillGroupDisplayName);
        setPrefillFallbackTried(false);
        setLastCompletedSearchTerm(null);
    }, [prefillGroupDisplayName, existingAssignment]);

    useEffect(() => {
        if (existingAssignment) return;

        let isActive = true;

        const runSearch = async () => {
            setIsSearchingGroups(true);
            setGroupSearchError(null);
            try {
                const token = await getAccessToken();
                const groups = await searchSecurityGroups(debouncedGroupSearchTerm, token);
                if (!isActive) return;
                setGroupOptions(groups);
            } catch (err: any) {
                if (!isActive) return;
                setGroupSearchError(err.message || 'Security groups could not be loaded.');
            } finally {
                if (isActive) {
                    setIsSearchingGroups(false);
                    setLastCompletedSearchTerm(debouncedGroupSearchTerm);
                }
            }
        };

        runSearch();

        return () => {
            isActive = false;
        };
    }, [debouncedGroupSearchTerm, existingAssignment, getAccessToken]);

    const handleSelectGroup = (group: SecurityGroupSearchResult) => {
        setSecurityGroupId(group.id);
        setSelectedGroupDisplayName(group.displayName);
        setGroupSearchTerm(group.displayName);
        setGroupSearchError(null);
        autoApplyPresetOrTemplate(group.displayName);
    };

    useEffect(() => {
        if (existingAssignment || !prefillGroupDisplayName || prefillSelectionApplied) return;

        const normalizedPrefill = prefillGroupDisplayName.toLowerCase();
        const normalizedCurrentTerm = debouncedGroupSearchTerm.toLowerCase();

        // Only evaluate auto-selection after the current search term has actually completed.
        if (!lastCompletedSearchTerm || lastCompletedSearchTerm.toLowerCase() !== normalizedCurrentTerm) return;
        if (isSearchingGroups) return;

        const exact = sortedGroupOptions.find(g => (g.displayName || '').toLowerCase() === normalizedPrefill);
        const startsWith = sortedGroupOptions.find(g => (g.displayName || '').toLowerCase().startsWith(normalizedPrefill));
        const contains = sortedGroupOptions.find(g => (g.displayName || '').toLowerCase().includes(normalizedPrefill));
        const fallbackBase = getGroupBaseName(prefillGroupDisplayName).toLowerCase();
        const startsWithFallback = sortedGroupOptions.find(g => (g.displayName || '').toLowerCase().startsWith(fallbackBase));
        const containsFallback = sortedGroupOptions.find(g => (g.displayName || '').toLowerCase().includes(fallbackBase));
        const candidate = exact || startsWith || contains || startsWithFallback || containsFallback;

        if (candidate) {
            handleSelectGroup(candidate);
            setPrefillSelectionApplied(true);
        } else {
            const canTryFallback = !prefillFallbackTried && fallbackBase !== normalizedPrefill;
            if (canTryFallback) {
                setPrefillFallbackTried(true);
                setGroupSearchTerm(fallbackBase);
                setGroupSearchError(`No exact match for "${prefillGroupDisplayName}". Trying broader search "${fallbackBase}"...`);
                return;
            }

            setGroupSearchError(`No matching security group found for "${prefillGroupDisplayName}".`);
            setPrefillSelectionApplied(true);
        }
    }, [
        existingAssignment,
        prefillGroupDisplayName,
        prefillSelectionApplied,
        prefillFallbackTried,
        sortedGroupOptions,
        debouncedGroupSearchTerm,
        isSearchingGroups,
        lastCompletedSearchTerm,
    ]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!securityGroupId.trim() || selectedRoleIds.length === 0) {
            setError('Security Group ID and at least one role are required.');
            return;
        }

        // Validate selected roles against allowed roles of the relationship
        if (allowedRoleIds && allowedRoleIds.length > 0) {
            const disallowedRoleIds = selectedRoleIds.filter(id => !allowedRoleIds.includes(id));
            if (disallowedRoleIds.length > 0) {
                const disallowedRoleNames = disallowedRoleIds.map(
                    id => AZURE_AD_ROLES.find(r => r.id === id)?.displayName || id
                );
                setError(
                    `The following role${disallowedRoleIds.length > 1 ? 's are' : ' is'} not authorized in this GDAP relationship and cannot be assigned: ${disallowedRoleNames.join(', ')}`
                );
                return;
            }
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const token = await getAccessToken();
            let savedResult: DelegatedAdminAccessAssignment | null = null;
            if (existingAssignment) {
                const etag = existingAssignment['@odata.etag'];
                if (!etag) {
                    setError('The assignment data is stale. Please refresh.');
                    setIsSubmitting(false);
                    return;
                }
                const updated = await updateGDAPAccessAssignment(relationshipId, existingAssignment.id, selectedRoleIds, etag, token);
                savedResult = {
                    ...updated,
                    accessContainer: {
                        ...updated.accessContainer,
                        displayName: selectedGroupDisplayName || existingAssignment.accessContainer.displayName || 'Security Group',
                    },
                };
            } else {
                const created = await createGDAPAccessAssignment(relationshipId, securityGroupId, selectedRoleIds, token);
                savedResult = {
                    ...created,
                    accessContainer: {
                        ...created.accessContainer,
                        displayName: selectedGroupDisplayName || 'Security Group',
                    },
                };
            }
            onSave(savedResult || undefined);
        } catch (err: any) {
            let errorMsg = err.message || 'An error occurred.';
            // Provide human-friendly explanations for common Graph errors
            if (errorMsg.includes('A condition set for the request failed')) {
                if (allowedRoleIds && allowedRoleIds.length > 0) {
                    const disallowed = selectedRoleIds.filter(id => !allowedRoleIds.includes(id));
                    if (disallowed.length > 0) {
                        const names = disallowed.map(id => AZURE_AD_ROLES.find(r => r.id === id)?.displayName || id);
                        errorMsg = `Assignment rejected: The relationship does not contain the role(s): ${names.join(', ')}.`;
                    } else {
                        errorMsg = 'Precondition failed (412): The assignment data on the server has changed. Please refresh the page and try again.';
                    }
                } else {
                    errorMsg = 'Precondition failed (412): Either the assignment was modified elsewhere (stale ETag) or one of the roles is not granted in the GDAP relationship. Please refresh and retry.';
                }
            }
            setError(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const sortedSelectedRoleIds = useMemo(
        () =>
            [...selectedRoleIds].sort((a, b) => {
                const nameA = AZURE_AD_ROLES.find((r) => r.id === a)?.displayName || a;
                const nameB = AZURE_AD_ROLES.find((r) => r.id === b)?.displayName || b;
                return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
            }),
        [selectedRoleIds]
    );

    const applyRoleList = (presetOrTemplateName: string, roleIds: string[]) => {
        let validRoles = roleIds;
        let droppedRoleIds: string[] = [];
        if (allowedRoleIds) {
            validRoles = roleIds.filter(id => allowedRoleIds.includes(id));
            droppedRoleIds = roleIds.filter(id => !allowedRoleIds.includes(id));
        }
        setSelectedRoleIds(validRoles);
        setAppliedTemplateName(presetOrTemplateName);
        if (droppedRoleIds.length > 0) {
            const droppedNames = droppedRoleIds.map(id => AZURE_AD_ROLES.find(r => r.id === id)?.displayName || id).join(', ');
            setTemplateWarning(`Roles not available in this relationship: ${droppedNames}.`);
        } else {
            setTemplateWarning(null);
        }
    };

    const autoApplyPresetOrTemplate = (groupDisplayName: string) => {
        const normalizedGroupName = groupDisplayName.toLowerCase();
        const baseName = getGroupBaseName(groupDisplayName).toLowerCase();

        const matched = unifiedTemplates.find((t) => {
            const tLower = t.name.toLowerCase();
            return normalizedGroupName === tLower || baseName === tLower || normalizedGroupName.includes(tLower);
        });

        if (matched) {
            applyRoleList(matched.name, matched.roleIds);
        }
    };

    const handleOpenSavePreset = () => {
        setPresetNameInput(activePresetTargetName);
        setIsSavingPreset(true);
    };

    const handleConfirmSavePreset = async () => {
        const trimmed = presetNameInput.trim();
        if (!trimmed) return;
        if (selectedRoleIds.length === 0) {
            setTemplateWarning('Select at least one role before saving as a preset.');
            return;
        }

        try {
            const res = await window.electronAPI.saveRolePreset(trimmed, selectedRoleIds);
            if (res?.presets) {
                setUserPresets(res.presets);
            } else {
                setUserPresets(prev => ({ ...prev, [trimmed]: selectedRoleIds }));
            }
            await window.electronAPI.saveDefaultRoles(selectedRoleIds);
            setAppliedTemplateName(trimmed);
            setIsSavingPreset(false);
            setTemplateWarning(null);
        } catch (err: any) {
            console.error('Failed to save preset:', err);
            setTemplateWarning(err.message || 'Failed to save preset.');
        }
    };

    const handleDeleteOrRevertTemplate = async (
        template: { name: string; isBuiltIn: boolean; isCustomized: boolean; roleIds: string[] },
        e: React.MouseEvent
    ) => {
        e.stopPropagation();
        if (template.isBuiltIn && template.isCustomized) {
            const originalTemplate = Object.values(GROUP_TEMPLATES).find(
                (t) => t.name.toLowerCase() === template.name.toLowerCase()
            );
            const originalCount = originalTemplate ? originalTemplate.roleIds.length : 'default';
            if (
                !window.confirm(
                    `Revert template "${template.name}" back to built-in default (${originalCount} roles)?`
                )
            ) {
                return;
            }

            try {
                const res = await window.electronAPI.deleteRolePreset(template.name);
                if (res?.presets) {
                    setUserPresets(res.presets);
                } else {
                    setUserPresets((prev) => {
                        const next = { ...prev };
                        delete next[template.name];
                        return next;
                    });
                }
                if (appliedTemplateName === template.name && originalTemplate) {
                    applyRoleList(originalTemplate.name, originalTemplate.roleIds);
                }
            } catch (err) {
                console.error('Failed to revert template:', err);
            }
        } else if (!template.isBuiltIn) {
            if (!window.confirm(`Delete preset "${template.name}"?`)) return;

            try {
                const res = await window.electronAPI.deleteRolePreset(template.name);
                if (res?.presets) {
                    setUserPresets(res.presets);
                } else {
                    setUserPresets((prev) => {
                        const next = { ...prev };
                        delete next[template.name];
                        return next;
                    });
                }
                if (appliedTemplateName === template.name) {
                    setAppliedTemplateName(null);
                }
            } catch (err) {
                console.error('Failed to delete preset:', err);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border border-indigo-200 rounded-lg bg-indigo-50/30 space-y-4 shadow-sm">
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900">{existingAssignment ? 'Edit Assignment' : 'New Assignment'}</h3>
                    {existingAssignment && (
                        <p className="text-sm font-semibold text-indigo-700 mt-0.5 break-words">
                            {existingAssignment.accessContainer.displayName || 'Unnamed Group'}
                        </p>
                    )}
                </div>
            </div>

            {existingAssignment ? (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Security Group ID</label>
                    <input
                        type="text"
                        value={securityGroupId}
                        onChange={(e) => setSecurityGroupId(e.target.value)}
                        disabled
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 font-mono"
                        placeholder="Enter Group Object ID"
                        required
                    />
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Search Security Group</label>
                        <div className="relative mt-1">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={groupSearchTerm}
                                onChange={(e) => setGroupSearchTerm(e.target.value)}
                                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Filter by display name (e.g. Helpdesk)"
                            />
                        </div>
                        {groupSearchError && <p className="mt-2 text-xs text-red-600">{groupSearchError}</p>}
                    </div>

                    <div className="border border-gray-200 rounded-md bg-white max-h-48 overflow-y-auto">
                        {isSearchingGroups ? (
                            <div className="px-3 py-2 text-xs text-gray-500 flex items-center">
                                <SpinnerIcon className="animate-spin h-4 w-4 mr-2" />
                                Loading groups...
                            </div>
                        ) : sortedGroupOptions.length > 0 ? (
                            <ul>
                                {sortedGroupOptions.map((group) => {
                                    const isAlreadyUsed = usedSecurityGroupIdSet.has(group.id);
                                    return (
                                        <li key={group.id}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectGroup(group)}
                                                className={`w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors ${securityGroupId === group.id ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}
                                            >
                                                <p className={`text-sm font-semibold truncate ${isAlreadyUsed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                    {group.displayName}
                                                </p>
                                                <p className={`text-xs font-mono truncate ${isAlreadyUsed ? 'text-gray-400 line-through' : 'text-gray-500'}`}>
                                                    {group.id}
                                                </p>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="px-3 py-2 text-xs text-gray-500">No matching security groups found.</div>
                        )}
                    </div>

                    {selectedGroupDisplayName && (
                        <div className="px-3 py-2 rounded-md bg-indigo-50 border border-indigo-100 text-sm text-indigo-800">
                            Selected: <span className="font-semibold">{selectedGroupDisplayName}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Security Group ID</label>
                        <input
                            type="text"
                            value={securityGroupId}
                            onChange={(e) => {
                                setSecurityGroupId(e.target.value);
                                if (!e.target.value) setSelectedGroupDisplayName(null);
                            }}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                            placeholder="Selected ID appears here (or enter manually)"
                            required
                        />
                    </div>
                </div>
            )}

            {/* Presets & Templates Section (Visible for both New and Existing Assignments) */}
            <div className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span className="text-xs font-black uppercase tracking-wider text-gray-800">
                            Templates & Presets
                        </span>
                        <p className="text-[11px] text-gray-500">
                            Click a template to apply & overwrite roles. Customized templates show an orange dot (●).
                        </p>
                    </div>
                    {!isSavingPreset && (
                        <button
                            type="button"
                            onClick={handleOpenSavePreset}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-xs"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            <span>Save Current as Preset / Template</span>
                        </button>
                    )}
                </div>

                {/* Save Preset Inline Prompt */}
                {isSavingPreset && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in">
                        <label className="block text-xs font-bold text-indigo-900">
                            Save current selection ({selectedRoleIds.length} roles) into template:
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={presetNameInput}
                                onChange={(e) => setPresetNameInput(e.target.value)}
                                placeholder="Template/Preset Name (e.g. CSCT_M365_Compliance)"
                                className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleConfirmSavePreset();
                                    } else if (e.key === 'Escape') {
                                        setIsSavingPreset(false);
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleConfirmSavePreset}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                            >
                                Save Template
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsSavingPreset(false)}
                                className="px-2.5 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Unified Templates Grid */}
                <div className="flex flex-wrap gap-2 pt-1">
                    {unifiedTemplates.map((template) => {
                        const isApplied = appliedTemplateName?.toLowerCase() === template.name.toLowerCase();
                        const isMatchingGroup = matchingTemplateName?.toLowerCase() === template.name.toLowerCase();
                        return (
                            <div
                                key={template.name}
                                className={`inline-flex items-center rounded-lg border-2 transition-all ${
                                    isApplied
                                        ? 'border-gray-900 shadow-md ring-2 ring-gray-900'
                                        : isMatchingGroup
                                        ? 'border-indigo-600 shadow-md ring-2 ring-indigo-500'
                                        : 'border-transparent shadow-xs hover:opacity-90'
                                }`}
                                style={{
                                    backgroundColor: template.color,
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => applyRoleList(template.name, template.roleIds)}
                                    className="px-2.5 py-1 text-xs font-bold text-white flex items-center gap-1.5"
                                    title={`Apply "${template.name}" (${template.roleIds.length} roles)${
                                        isMatchingGroup ? ' [Matches this group name]' : ''
                                    }${template.isCustomized ? ' - Customized' : ''}`}
                                >
                                    {isMatchingGroup && !isApplied && (
                                        <span
                                            className="inline-block w-2 h-2 rounded-full bg-indigo-200 ring-1 ring-white animate-pulse"
                                            title="Matching template for this security group"
                                        />
                                    )}
                                    <span>{template.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-black/25 text-white">
                                        {template.roleIds.length}
                                    </span>
                                    {template.isCustomized && (
                                        <span
                                            className="inline-block w-2 h-2 rounded-full bg-amber-300"
                                            title="Customized role set"
                                        />
                                    )}
                                </button>
                                {template.isCustomized && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleDeleteOrRevertTemplate(template, e)}
                                        className="pr-2 pl-0.5 py-1 text-xs text-white/80 hover:text-white transition-colors"
                                        title={
                                            template.isBuiltIn
                                                ? `Revert "${template.name}" back to built-in default`
                                                : `Delete custom preset "${template.name}"`
                                        }
                                    >
                                        {template.isBuiltIn ? '↺' : '✕'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {templateWarning && (
                    <div className="p-2 bg-yellow-50 text-yellow-800 text-xs border border-yellow-200 rounded-lg">
                        {templateWarning}
                    </div>
                )}
            </div>

            <div>
                 <h4 className="text-md font-bold text-gray-800 mb-2">Assign Roles ({selectedRoleIds.length} selected)</h4>
                 <RoleSelector
                    selectedRoleIds={selectedRoleIds}
                    onSelectedRoleIdsChange={setSelectedRoleIds}
                    userDefaultRoles={activePresetRoles}
                    onSaveDefaults={handleSaveDefaults}
                    onResetDefaults={handleResetDefaults}
                    allowedRoleIds={allowedRoleIds}
                    saveButtonLabel={`Save as "${activePresetTargetName}" Preset`}
                    defaultOptionLabel={
                        activeTemplate
                            ? `Use "${activePresetTargetName}" Preset`
                            : `Use "${activePresetTargetName}" Preset (not defined)`
                    }
                />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{error}</p>}

            <div className="flex justify-end space-x-3 pt-2 border-t border-indigo-100">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center justify-center min-w-[120px]">
                    {isSubmitting ? <SpinnerIcon className="animate-spin h-5 w-5" /> : 'Save Assignment'}
                </button>
            </div>
        </form>
    );
};

const AssignmentEditor: React.FC<AssignmentEditorProps> = ({
    relationship,
    getAccessToken: propGetAccessToken,
    onUpdateRelationship,
    onAssignmentsLoaded,
    allRelationshipGroupNames = {},
    initialEditingAssignmentId,
    onBackToGroupOverview,
}) => {
    const getAccessToken = propGetAccessToken || defaultGetAccessToken;
    const [assignments, setAssignments] = useState<DelegatedAdminAccessAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdatingAutoExtend, setIsUpdatingAutoExtend] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [editingAssignment, setEditingAssignment] = useState<DelegatedAdminAccessAssignment | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [prefillGroupName, setPrefillGroupName] = useState<string | null>(null);
    const [tenantOnMicrosoftDomain, setTenantOnMicrosoftDomain] = useState<string | null>(null);
    const [isLoadingTenantNamespace, setIsLoadingTenantNamespace] = useState(false);
    const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
    const [refreshingAssignmentId, setRefreshingAssignmentId] = useState<string | null>(null);
    const [refreshedAssignmentId, setRefreshedAssignmentId] = useState<string | null>(null);
    const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
    const [showDisableAutoExtendConfirm, setShowDisableAutoExtendConfirm] = useState(false);

    const roleMap = useMemo(() => new Map<string, UnifiedRole>(AZURE_AD_ROLES.map(role => [role.id, role])), []);
    const sortedAssignments = useMemo(
        () =>
            [...assignments].sort((a, b) =>
                (a.accessContainer.displayName || '').localeCompare(b.accessContainer.displayName || '', 'de', { sensitivity: 'base' })
            ),
        [assignments]
    );
    const usedSecurityGroupIds = useMemo(
        () => assignments.map(a => a.accessContainer.accessContainerId).filter(Boolean),
        [assignments]
    );

    const assignedGroupNamesLower = useMemo(
        () => new Set(
            assignments
                .map(a => a.accessContainer.displayName)
                .filter((name): name is string => !!name && name !== 'Name not found')
                .map(name => name.toLowerCase())
        ),
        [assignments]
    );

    const missingGroupSuggestions = useMemo(() => {
        if (!relationship) return [];

        const relationshipSuffix = extractRelationshipSuffix(relationship.displayName);
        if (!relationshipSuffix) return [];

        const allKnownGroupNames = Object.values(allRelationshipGroupNames)
            .flat()
            .filter(Boolean);
        if (allKnownGroupNames.length === 0) return [];

        const familyNames = [...new Set(allKnownGroupNames.map(getGroupBaseName))]
            .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

        const suggestions = familyNames
            .map(family => {
                const familyGroupNames = allKnownGroupNames
                    .filter(name => belongsToFamily(name, family))
                    .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
                if (familyGroupNames.length === 0) return null;

                if (MICROSOFT_STANDARD_AGENT_GROUPS_LOWER.has(family.toLowerCase())) return null;

                const expectedSuffixName = `${family}-${relationshipSuffix}`;
                const hasExpectedSuffixAssigned = assignedGroupNamesLower.has(expectedSuffixName.toLowerCase());
                const hasUnsuffixedAssigned = assignedGroupNamesLower.has(family.toLowerCase());
                if (hasExpectedSuffixAssigned || hasUnsuffixedAssigned) return null;

                const unsuffixedName = familyGroupNames.find(
                    name => name.toLowerCase() === family.toLowerCase()
                );

                // If an unsuffixed canonical group exists globally, suggest it;
                // otherwise suggest the relationship-specific target name.
                return unsuffixedName || expectedSuffixName;
            })
            .filter((name): name is string => !!name);

        return [...new Set(suggestions)].sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
    }, [relationship, assignedGroupNamesLower, allRelationshipGroupNames]);

    const missingStandardGroups = useMemo(
        () => MICROSOFT_STANDARD_AGENT_GROUPS.filter(g => !assignedGroupNamesLower.has(g.toLowerCase())),
        [assignedGroupNamesLower]
    );

    const allowedRoleIds = useMemo(() => {
        if (!relationship?.accessDetails?.unifiedRoles) return undefined;
        return relationship.accessDetails.unifiedRoles.map(r => r.roleDefinitionId);
    }, [relationship]);

    const fetchAssignments = useCallback(async (forceRefresh = false) => {
        if (!relationship) return;
        setIsLoading(true);
        setError(null);
        setFeedbackMessage(null);
        try {
            const token = await getAccessToken();
            const data = await getGDAPAssignmentsWithGroupDisplayNames(relationship.id, token, forceRefresh);
            setAssignments(data);
            const groupNames = data
                .map(a => a.accessContainer.displayName)
                .filter((name): name is string => !!name && name !== 'Name not found');
            onAssignmentsLoaded?.(relationship.id, data.length, groupNames, data);
            if (initialEditingAssignmentId) {
                const target = data.find(a => a.id === initialEditingAssignmentId);
                if (target) {
                    setEditingAssignment(target);
                }
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [relationship, getAccessToken, onAssignmentsLoaded, initialEditingAssignmentId]);

    const handleRefreshSingleAssignment = async (assignment: DelegatedAdminAccessAssignment) => {
        if (!relationship) return;
        setRefreshingAssignmentId(assignment.id);
        setError(null);
        try {
            const token = await getAccessToken();
            const fresh = await getGDAPSingleAccessAssignment(relationship.id, assignment.id, token);
            setAssignments(prev => prev.map(a => a.id === assignment.id ? fresh : a));
            setRefreshedAssignmentId(assignment.id);
            setTimeout(() => {
                setRefreshedAssignmentId((prev) => (prev === assignment.id ? null : prev));
            }, 3000);

            const nextAssignments = assignments.map(a => a.id === assignment.id ? fresh : a);
            const groupNames = nextAssignments
                .map(a => a.accessContainer.displayName)
                .filter((name): name is string => !!name && name !== 'Name not found');
            onAssignmentsLoaded?.(relationship.id, nextAssignments.length, groupNames, nextAssignments);
        } catch (err: any) {
            setError(err.message || 'Failed to refresh assignment.');
        } finally {
            setRefreshingAssignmentId(null);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, [fetchAssignments]);

    useEffect(() => {
        if (!relationship) {
            setTenantOnMicrosoftDomain(null);
            setIsLoadingTenantNamespace(false);
            return;
        }

        let cancelled = false;
        setTenantOnMicrosoftDomain(null);
        setIsLoadingTenantNamespace(true);
        (async () => {
            try {
                const token = await getAccessToken();
                const domain = await getTenantOnMicrosoftDomain(relationship.customer.tenantId, token);
                if (!cancelled) setTenantOnMicrosoftDomain(domain);
            } catch {
                if (!cancelled) setTenantOnMicrosoftDomain(null);
            } finally {
                if (!cancelled) setIsLoadingTenantNamespace(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [relationship, getAccessToken]);

    const updateAutoExtend = async (nextState: boolean) => {
        if (!relationship || isUpdatingAutoExtend) return;

        const etag = relationship['@odata.etag'] as string;

        if (!etag) {
            setError('Relationship ETag is missing. Please refresh the list.');
            return;
        }

        setIsUpdatingAutoExtend(true);
        setError(null);
        try {
            const token = await getAccessToken();
            const updatedRelationship = await updateGDAPRelationshipAutoExtend(relationship.id, nextState, etag, token);
            
            // Notify parent component so the relationship prop updates correctly
            onUpdateRelationship(updatedRelationship);
            
            setFeedbackMessage(`Auto-extend successfully ${nextState ? 'enabled' : 'disabled'}.`);
            setTimeout(() => setFeedbackMessage(null), 4000);
        } catch (err: any) {
            console.error('Auto-extend update failed:', err);
            setError(err.message || 'Failed to update auto-extend status.');
        } finally {
            setIsUpdatingAutoExtend(false);
        }
    };

    const handleToggleAutoExtend = async () => {
        if (!relationship || isUpdatingAutoExtend) return;

        const isCurrentlyEnabled = relationship.autoExtendDuration !== null &&
                                  relationship.autoExtendDuration !== 'PT0S' &&
                                  relationship.autoExtendDuration !== 'P0D';

        const nextState = !isCurrentlyEnabled;

        if (!nextState) {
            setShowDisableAutoExtendConfirm(true);
            return;
        }

        await updateAutoExtend(nextState);
    };

    const handleRemoveAssignment = async (assignment: DelegatedAdminAccessAssignment) => {
        if (!window.confirm(`Are you sure you want to remove this assignment?`)) return;
        const etag = assignment['@odata.etag'];
        if (!etag) return;
        setIsProcessingId(assignment.id);
        try {
            const token = await getAccessToken();
            await deleteGDAPAccessAssignment(relationship!.id, assignment.id, etag, token);
            setAssignments(prev => prev.filter(a => a.id !== assignment.id));
            setFeedbackMessage(`Removed assignment.`);
            setTimeout(() => setFeedbackMessage(null), 4000);
        } catch (err: any) {
            setError(err.message || 'Failed to remove.');
        } finally {
            setIsProcessingId(null);
        }
    };

    const handleCreateAssignment = (groupName?: string) => {
        setEditingAssignment(null);
        setPrefillGroupName(groupName || null);
        setIsCreating(true);
    };
    
    if (!relationship) {
        return (
            <div className="flex items-start justify-start h-full text-left p-8 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                <div className="pt-2">
                    <h2 className="text-xl font-bold text-gray-600">Select a Relationship</h2>
                    <p className="mt-2 text-gray-500">Choose a relationship from the sidebar to manage assignments and auto-renew.</p>
                </div>
            </div>
        );
    }

    const { displayName, customer, endDateTime, autoExtendDuration } = relationship;
    const canHaveAssignments = relationship.status === 'active';
    const isAutoExtendEnabled = autoExtendDuration !== null && autoExtendDuration !== 'PT0S' && autoExtendDuration !== 'P0D';
    const formattedExpiry = formatToDMY(endDateTime);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {showDisableAutoExtendConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
                        <h3 className="text-lg font-black text-gray-900">Disable Auto-extend?</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Are you sure you want to disable auto-extend for this relationship?
                        </p>
                        <div className="mt-5 flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setShowDisableAutoExtendConfirm(false)}
                                className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setShowDisableAutoExtendConfirm(false);
                                    await updateAutoExtend(false);
                                }}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                            >
                                Disable
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {onBackToGroupOverview && (
                <div>
                    <button
                        type="button"
                        onClick={onBackToGroupOverview}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back to Group Search Results</span>
                    </button>
                </div>
            )}
            <header className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-gray-100 pb-6 gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                    <h2 className="text-2xl font-black text-gray-900 break-words leading-tight" title={displayName}>{displayName}</h2>
                    <p className="text-xs text-gray-400 font-mono tracking-tight">
                        Tenant ID: {customer.tenantId}
                        <span className="mx-2 text-gray-300">|</span>
                        Default Namespace:{' '}
                        {isLoadingTenantNamespace ? (
                            <span className="inline-flex items-center gap-2 align-middle text-gray-400">
                                <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 align-middle">
                                    <span className="block h-full w-1/2 animate-pulse rounded-full bg-indigo-300" />
                                </span>
                                Loading...
                            </span>
                        ) : (tenantOnMicrosoftDomain || 'Not available')}
                    </p>
                    <p className="text-sm font-bold text-gray-700 mt-2">
                        Expires (DD/MM/YYYY): <span className="text-indigo-600">{formattedExpiry}</span>
                    </p>
                </div>
                
                <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                    <div className="flex items-center space-x-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
                        <button
                            onClick={() => { void fetchAssignments(true); }}
                            disabled={isLoading}
                            className="inline-flex items-center px-3 py-2 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <SpinnerIcon className="animate-spin h-4 w-4 mr-2" />
                                    Syncing...
                                </>
                            ) : (
                                'Sync Assignments'
                            )}
                        </button>
                        <span className="text-sm font-extrabold text-gray-700">Auto-extend</span>
                        <button
                            onClick={handleToggleAutoExtend}
                            disabled={isUpdatingAutoExtend}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${isAutoExtendEnabled ? 'bg-indigo-600' : 'bg-gray-200'} ${isUpdatingAutoExtend ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            <span className="sr-only">Toggle auto-extend</span>
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoExtendEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                        {isUpdatingAutoExtend && <SpinnerIcon className="animate-spin h-4 w-4 text-indigo-600" />}
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest ${isAutoExtendEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {isAutoExtendEnabled ? 'Active (P180D)' : 'Disabled'}
                    </span>
                </div>
            </header>

            {feedbackMessage && <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-bold animate-pulse">{feedbackMessage}</div>}
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold">{error}</div>}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-16 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <SpinnerIcon className="h-12 w-12 animate-spin text-indigo-600" />
                    <span className="mt-4 text-gray-500 font-black uppercase text-xs tracking-[0.2em]">Syncing assignments...</span>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Access Assignments</h3>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => { void fetchAssignments(true); }} title="Refresh Assignments" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h5M20 20v-5h-5M4 4a14.95 14.95 0 0113.433 4.805M20 20a14.95 14.95 0 01-13.433-4.805" /></svg></button>
                            {canHaveAssignments && (
                                <button onClick={() => handleCreateAssignment()} disabled={isCreating} className="px-4 py-2 text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50">New Assignment</button>
                            )}
                        </div>
                    </div>

                    {!canHaveAssignments && (
                        <div className="p-4 bg-amber-50 text-amber-800 text-sm rounded-2xl border border-amber-100 font-bold flex items-center">
                            <svg className="h-5 w-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                            Assignments can only be managed on active relationships. Status: {relationship.status.toUpperCase()}
                        </div>
                    )}

                    {canHaveAssignments && (missingGroupSuggestions.length > 0 || missingStandardGroups.length > 0) && (
                        <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Missing Groups</h4>
                                <span
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[10px] font-black text-gray-600 cursor-help"
                                    title="This section combines missing family-based groups (red) and missing Microsoft standard agent groups (yellow)."
                                >
                                    i
                                </span>
                            </div>

                            {missingGroupSuggestions.length > 0 && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-black text-rose-800 uppercase tracking-wider">Missing Groups for this Relationship</span>
                                        <span
                                            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-rose-300 text-[9px] font-black text-rose-700 cursor-help"
                                            title="Based on group families and the relationship suffix; Microsoft standard groups are excluded here to avoid duplicates."
                                        >
                                            i
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {missingGroupSuggestions.map(groupName => (
                                            <button
                                                key={groupName}
                                                type="button"
                                                onClick={() => handleCreateAssignment(groupName)}
                                                title="Create new assignment using this group name"
                                                className="px-2.5 py-1 text-xs font-bold bg-white text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                                            >
                                                {groupName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {missingStandardGroups.length > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-black text-amber-800 uppercase tracking-wider">Missing Standard Agent Groups</span>
                                        <span
                                            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-300 text-[9px] font-black text-amber-700 cursor-help"
                                            title="Microsoft built-in standard groups in CSP partner tenants: AdminAgents, HelpdeskAgents, SalesAgents."
                                        >
                                            i
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {missingStandardGroups.map(groupName => (
                                            <button
                                                key={groupName}
                                                type="button"
                                                onClick={() => handleCreateAssignment(groupName)}
                                                title="Create new assignment using this standard group"
                                                className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors"
                                            >
                                                {groupName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {isCreating && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <AssignmentForm
                                relationshipId={relationship.id}
                                onSave={(saved) => {
                                    setIsCreating(false);
                                    setPrefillGroupName(null);
                                    if (saved) {
                                        setAssignments(prev => {
                                            const next = [...prev.filter(a => a.id !== saved.id), saved];
                                            const groupNames = next
                                                .map(a => a.accessContainer.displayName)
                                                .filter((name): name is string => !!name && name !== 'Name not found');
                                            onAssignmentsLoaded?.(relationship.id, next.length, groupNames, next);
                                            return next;
                                        });
                                        setFeedbackMessage('Assignment created successfully.');
                                        setTimeout(() => setFeedbackMessage(null), 4000);
                                    } else {
                                        void fetchAssignments(true);
                                    }
                                }}
                                onCancel={() => { setIsCreating(false); setPrefillGroupName(null); }}
                                getAccessToken={getAccessToken}
                                allowedRoleIds={allowedRoleIds}
                                usedSecurityGroupIds={usedSecurityGroupIds}
                                prefillGroupDisplayName={prefillGroupName || undefined}
                            />
                        </div>
                    )}

                    {sortedAssignments.length > 0 ? (
                        <ul className="grid grid-cols-1 gap-4">
                            {sortedAssignments.map(a => editingAssignment?.id === a.id ? (
                                <li key={a.id} className="animate-in zoom-in-95 duration-200">
                                    <AssignmentForm
                                        relationshipId={relationship.id}
                                        existingAssignment={a}
                                        onSave={(saved) => {
                                            setEditingAssignment(null);
                                            if (saved) {
                                                setAssignments(prev => {
                                                    const next = prev.map(item => item.id === saved.id ? saved : item);
                                                    const groupNames = next
                                                        .map(item => item.accessContainer.displayName)
                                                        .filter((name): name is string => !!name && name !== 'Name not found');
                                                    onAssignmentsLoaded?.(relationship.id, next.length, groupNames, next);
                                                    return next;
                                                });
                                                setFeedbackMessage('Assignment updated successfully.');
                                                setTimeout(() => setFeedbackMessage(null), 4000);
                                            } else {
                                                void fetchAssignments(true);
                                            }
                                        }}
                                        onCancel={() => setEditingAssignment(null)}
                                        getAccessToken={getAccessToken}
                                        allowedRoleIds={allowedRoleIds}
                                    />
                                </li>
                            ) : (
                                <li key={a.id} className="group border border-gray-200 rounded-2xl bg-white overflow-hidden hover:shadow-xl hover:border-indigo-100 transition-all duration-300">
                                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between bg-white gap-4">
                                        <div className="flex items-center min-w-0 flex-1">
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-black text-gray-900 text-lg leading-tight break-words">
                                                    {a.accessContainer.displayName || 'Unnamed Group'}
                                                </span>
                                                <div className="flex items-center text-[11px] text-gray-400 font-mono mt-1">
                                                    <span className="truncate max-w-[240px]">{a.accessContainer.accessContainerId}</span>
                                                    <CopyToClipboard text={a.accessContainer.accessContainerId} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 flex-shrink-0 self-end sm:self-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRefreshSingleAssignment(a)}
                                                disabled={isProcessingId === a.id || refreshingAssignmentId === a.id}
                                                className={`text-sm px-3.5 py-2 font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5 ${
                                                    refreshedAssignmentId === a.id
                                                        ? 'bg-green-100 text-green-800 border border-green-300'
                                                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                                                }`}
                                                title="Refresh this security group assignment from Microsoft Graph"
                                            >
                                                {refreshingAssignmentId === a.id ? (
                                                    <>
                                                        <SpinnerIcon className="animate-spin h-4 w-4 text-indigo-600" />
                                                        <span>Refreshing...</span>
                                                    </>
                                                ) : refreshedAssignmentId === a.id ? (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-700" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                        <span>Refreshed!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h5M20 20v-5h-5M4 4a14.95 14.95 0 0113.433 4.805M20 20a14.95 14.95 0 01-13.433-4.805" />
                                                        </svg>
                                                        <span>Refresh</span>
                                                    </>
                                                )}
                                            </button>
                                            <button onClick={() => { setEditingAssignment(a); setIsCreating(false); setPrefillGroupName(null); }} disabled={isProcessingId === a.id || refreshingAssignmentId === a.id} className="text-sm px-4 py-2 font-black text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all active:scale-95">Edit</button>
                                            <button onClick={() => handleRemoveAssignment(a)} disabled={isProcessingId === a.id || refreshingAssignmentId === a.id} className="text-sm px-4 py-2 font-black text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all active:scale-95">
                                                {isProcessingId === a.id ? <SpinnerIcon className="animate-spin h-4 w-4" /> : 'Remove'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-50 bg-gray-50/20">
                                        <button onClick={() => setExpandedAssignmentId(expandedAssignmentId === a.id ? null : a.id)} className="w-full p-4 flex justify-between items-center text-left hover:bg-indigo-50/40 transition-colors">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{a.accessDetails.unifiedRoles.length} Roles Assigned</span>
                                            <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform duration-500 ${expandedAssignmentId === a.id ? 'rotate-180 text-indigo-600' : ''}`} />
                                        </button>
                                        {expandedAssignmentId === a.id && (
                                            <div className="px-4 pb-5 flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-300">
                                                {[...a.accessDetails.unifiedRoles]
                                                    .sort((r1, r2) => {
                                                        const name1 = roleMap.get(r1.roleDefinitionId)?.displayName || r1.roleDefinitionId;
                                                        const name2 = roleMap.get(r2.roleDefinitionId)?.displayName || r2.roleDefinitionId;
                                                        return name1.localeCompare(name2, 'de', { sensitivity: 'base' });
                                                    })
                                                    .map(r => (
                                                    <span key={r.roleDefinitionId} className="px-3 py-1 text-[11px] font-bold bg-white text-gray-700 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-200 hover:text-indigo-600 transition-colors">
                                                        {roleMap.get(r.roleDefinitionId)?.displayName || 'Unknown Role'}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (!isCreating && (
                        <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                            <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <p className="text-gray-400 font-black uppercase text-xs tracking-widest">No active assignments found.</p>
                            {canHaveAssignments && (
                                <button onClick={() => setIsCreating(true)} className="mt-4 text-indigo-600 font-black text-sm hover:underline decoration-2 underline-offset-4">Click here to add the first one</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AssignmentEditor;
