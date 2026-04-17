import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DelegatedAdminRelationship, DelegatedAdminAccessAssignment, UnifiedRole, SecurityGroupSearchResult } from '../types';
import {
    getGDAPAssignmentsWithGroupDisplayNames,
    createGDAPAccessAssignment,
    updateGDAPAccessAssignment,
    deleteGDAPAccessAssignment,
    updateGDAPRelationshipAutoExtend,
    searchSecurityGroups
} from '../services/graphService';
import { AZURE_AD_ROLES, GROUP_TEMPLATES } from '../constants';
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
    getAccessToken: () => Promise<string>;
    onUpdateRelationship: (relationship: DelegatedAdminRelationship) => void;
}

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

const AssignmentForm: React.FC<{
    relationshipId: string;
    existingAssignment?: DelegatedAdminAccessAssignment | null;
    onSave: () => void;
    onCancel: () => void;
    getAccessToken: () => Promise<string>;
    allowedRoleIds?: string[];
    usedSecurityGroupIds?: string[];
}> = ({ relationshipId, existingAssignment, onSave, onCancel, getAccessToken, allowedRoleIds, usedSecurityGroupIds = [] }) => {
    const [securityGroupId, setSecurityGroupId] = useState(existingAssignment?.accessContainer.accessContainerId || '');
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(existingAssignment?.accessDetails.unifiedRoles.map(r => r.roleDefinitionId) || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [templateWarning, setTemplateWarning] = useState<string | null>(null);
    const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);
    const [groupSearchTerm, setGroupSearchTerm] = useState('');
    const [groupOptions, setGroupOptions] = useState<SecurityGroupSearchResult[]>([]);
    const [selectedGroupDisplayName, setSelectedGroupDisplayName] = useState<string | null>(
        existingAssignment?.accessContainer.displayName || null
    );
    const [isSearchingGroups, setIsSearchingGroups] = useState(false);
    const [groupSearchError, setGroupSearchError] = useState<string | null>(null);

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
                if (isActive) setIsSearchingGroups(false);
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
        autoApplyTemplateByGroupName(group.displayName);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!securityGroupId.trim() || selectedRoleIds.length === 0) {
            setError('Security Group ID and at least one role are required.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const token = await getAccessToken();
            if (existingAssignment) {
                const etag = existingAssignment['@odata.etag'];
                if (!etag) {
                    setError('The assignment data is stale. Please refresh.');
                    setIsSubmitting(false);
                    return;
                }
                await updateGDAPAccessAssignment(relationshipId, existingAssignment.id, selectedRoleIds, etag, token);
            } else {
                await createGDAPAccessAssignment(relationshipId, securityGroupId, selectedRoleIds, token);
            }
            onSave();
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const templateEntries = useMemo(() => Object.entries(GROUP_TEMPLATES), []);
    const templateColorMap = useMemo(
        () =>
            Object.fromEntries(
                templateEntries.map(([key]) => [key, buildTemplateColor(key)])
            ) as Record<string, string>,
        [templateEntries]
    );
    const templateMatchers = useMemo(
        () =>
            templateEntries
                .map(([key, template]) => ({
                    key,
                    variants: [key.toLowerCase(), template.name.toLowerCase()]
                }))
                .sort((a, b) => {
                    const longestA = Math.max(...a.variants.map(v => v.length));
                    const longestB = Math.max(...b.variants.map(v => v.length));
                    return longestB - longestA;
                }),
        [templateEntries]
    );
    const sortedSelectedRoleIds = useMemo(
        () =>
            [...selectedRoleIds].sort((a, b) => {
                const nameA = AZURE_AD_ROLES.find((r) => r.id === a)?.displayName || a;
                const nameB = AZURE_AD_ROLES.find((r) => r.id === b)?.displayName || b;
                return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
            }),
        [selectedRoleIds]
    );

    const applyTemplate = (templateKey: string) => {
        const selectedTemplate = GROUP_TEMPLATES[templateKey];
        if (!selectedTemplate) {
            setError(`Template not found: ${templateKey}`);
            return;
        }
        let validRoles = selectedTemplate.roleIds;
        let droppedRoleIds: string[] = [];
        if (allowedRoleIds) {
            validRoles = selectedTemplate.roleIds.filter(id => allowedRoleIds.includes(id));
            droppedRoleIds = selectedTemplate.roleIds.filter(id => !allowedRoleIds.includes(id));
        }
        setSelectedRoleIds(validRoles);
        setAppliedTemplateName(selectedTemplate.name);
        if (droppedRoleIds.length > 0) {
            const droppedNames = droppedRoleIds.map(id => AZURE_AD_ROLES.find(r => r.id === id)?.displayName || id).join(', ');
            setTemplateWarning(`Roles not available: ${droppedNames}.`);
        } else {
            setTemplateWarning(null);
        }
    };

    const autoApplyTemplateByGroupName = (groupDisplayName: string) => {
        const normalizedGroupName = groupDisplayName.toLowerCase();
        const matchedTemplate = templateMatchers.find((templateMatcher) =>
            templateMatcher.variants.some((variant) => normalizedGroupName.includes(variant))
        );

        if (matchedTemplate) {
            applyTemplate(matchedTemplate.key);
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


            {existingAssignment && selectedRoleIds.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Assigned Roles ({selectedRoleIds.length})</h4>
                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                        {sortedSelectedRoleIds.map(roleId => {
                            const role = AZURE_AD_ROLES.find(r => r.id === roleId);
                            if (!role) return null;
                            return (
                                <div key={roleId} className="relative flex items-start p-3 rounded-md hover:bg-gray-50">
                                    <div className="flex items-center h-5">
                                        <input type="checkbox" checked readOnly className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <span className="font-medium text-gray-900">{role.displayName}</span>
                                        <p className="text-gray-500">{role.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!existingAssignment && (
                <div className="flex flex-col space-y-2">
                    <div className="flex flex-wrap items-center gap-2 pb-1">
                        <span className="text-sm font-medium text-gray-700">Templates:</span>
                        {templateEntries.map(([key, template]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => applyTemplate(key)}
                                style={{ backgroundColor: templateColorMap[key] }}
                                className={`px-3 py-1 text-xs font-bold text-white rounded-full transition-opacity whitespace-nowrap hover:opacity-90 border-4 ${appliedTemplateName === template.name ? 'border-gray-900' : 'border-transparent'}`}
                            >
                                {template.name}
                            </button>
                        ))}
                    </div>
                    {templateWarning && <div className="p-2 bg-yellow-50 text-yellow-800 text-xs border border-yellow-200 rounded">{templateWarning}</div>}
                    {appliedTemplateName && selectedRoleIds.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4 bg-white">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Included Roles – {appliedTemplateName} ({selectedRoleIds.length})</h4>
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                                {sortedSelectedRoleIds.map(roleId => {
                                    const role = AZURE_AD_ROLES.find(r => r.id === roleId);
                                    if (!role) return null;
                                    return (
                                        <div key={roleId} className="relative flex items-start p-3 rounded-md hover:bg-gray-50">
                                            <div className="flex items-center h-5">
                                                <input type="checkbox" checked readOnly className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <span className="font-medium text-gray-900">{role.displayName}</span>
                                                <p className="text-gray-500">{role.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div>
                 <h4 className="text-md font-bold text-gray-800 mb-2">Assign Roles</h4>
                 <RoleSelector
                    selectedRoleIds={selectedRoleIds}
                    onSelectedRoleIdsChange={setSelectedRoleIds}
                    userDefaultRoles={null}
                    onSaveDefaults={async () => {}}
                    onResetDefaults={async () => {}}
                    allowedRoleIds={allowedRoleIds}
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

const AssignmentEditor: React.FC<AssignmentEditorProps> = ({ relationship, getAccessToken, onUpdateRelationship }) => {
    const [assignments, setAssignments] = useState<DelegatedAdminAccessAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdatingAutoExtend, setIsUpdatingAutoExtend] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [editingAssignment, setEditingAssignment] = useState<DelegatedAdminAccessAssignment | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
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

    const allowedRoleIds = useMemo(() => {
        if (!relationship?.accessDetails?.unifiedRoles) return undefined;
        return relationship.accessDetails.unifiedRoles.map(r => r.roleDefinitionId);
    }, [relationship]);

    const fetchAssignments = useCallback(async () => {
        if (!relationship) return;
        setIsLoading(true);
        setError(null);
        setFeedbackMessage(null);
        try {
            const token = await getAccessToken();
            const data = await getGDAPAssignmentsWithGroupDisplayNames(relationship.id, token);
            setAssignments(data);
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [relationship, getAccessToken]);

    useEffect(() => {
        fetchAssignments();
    }, [fetchAssignments]);

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
            <header className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-gray-100 pb-6 gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                    <h2 className="text-2xl font-black text-gray-900 break-words leading-tight" title={displayName}>{displayName}</h2>
                    <p className="text-xs text-gray-400 font-mono tracking-tight">Tenant ID: {customer.tenantId}</p>
                    <p className="text-sm font-bold text-gray-700 mt-2">
                        Expires (DD/MM/YYYY): <span className="text-indigo-600">{formattedExpiry}</span>
                    </p>
                </div>
                
                <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                    <div className="flex items-center space-x-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
                        <button
                            onClick={fetchAssignments}
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
                            <button onClick={fetchAssignments} title="Refresh Assignments" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h5M20 20v-5h-5M4 4a14.95 14.95 0 0113.433 4.805M20 20a14.95 14.95 0 01-13.433-4.805" /></svg></button>
                            {canHaveAssignments && (
                                <button onClick={() => { setIsCreating(true); setEditingAssignment(null); }} disabled={isCreating} className="px-4 py-2 text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50">New Assignment</button>
                            )}
                        </div>
                    </div>

                    {!canHaveAssignments && (
                        <div className="p-4 bg-amber-50 text-amber-800 text-sm rounded-2xl border border-amber-100 font-bold flex items-center">
                            <svg className="h-5 w-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                            Assignments can only be managed on active relationships. Status: {relationship.status.toUpperCase()}
                        </div>
                    )}
                    
                    {isCreating && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <AssignmentForm relationshipId={relationship.id} onSave={() => { setIsCreating(false); fetchAssignments(); }} onCancel={() => setIsCreating(false)} getAccessToken={getAccessToken} allowedRoleIds={allowedRoleIds} usedSecurityGroupIds={usedSecurityGroupIds} />
                        </div>
                    )}

                    {sortedAssignments.length > 0 ? (
                        <ul className="grid grid-cols-1 gap-4">
                            {sortedAssignments.map(a => editingAssignment?.id === a.id ? (
                                <li key={a.id} className="animate-in zoom-in-95 duration-200">
                                    <AssignmentForm relationshipId={relationship.id} existingAssignment={a} onSave={() => { setEditingAssignment(null); fetchAssignments(); }} onCancel={() => setEditingAssignment(null)} getAccessToken={getAccessToken} allowedRoleIds={allowedRoleIds} />
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
                                            <button onClick={() => { setEditingAssignment(a); setIsCreating(false); }} disabled={isProcessingId === a.id} className="text-sm px-4 py-2 font-black text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all active:scale-95">Edit</button>
                                            <button onClick={() => handleRemoveAssignment(a)} disabled={isProcessingId === a.id} className="text-sm px-4 py-2 font-black text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all active:scale-95">
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
