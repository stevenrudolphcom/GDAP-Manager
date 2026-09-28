import React, { useMemo, useState } from 'react';
import { DelegatedAdminRelationship, DelegatedAdminAccessAssignment, UnifiedRole } from '../types';
import { AZURE_AD_ROLES } from '../constants';
import { deleteGDAPAccessAssignment, getGDAPSingleAccessAssignment } from '../services/graphService';
import { AssignmentForm } from './AssignmentEditor';
import ClipboardIcon from './icons/ClipboardIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import SearchIcon from './icons/SearchIcon';
import SpinnerIcon from './icons/SpinnerIcon';

export interface GroupMatchItem {
    key: string;
    relationship: DelegatedAdminRelationship;
    assignment: DelegatedAdminAccessAssignment;
}

interface GroupAssignmentsOverviewProps {
    searchTerm: string;
    relationships: DelegatedAdminRelationship[];
    assignmentsByRelationshipId: Record<string, DelegatedAdminAccessAssignment[]>;
    getAccessToken?: () => Promise<string>;
    onAssignmentsChanged: (relationshipId: string, optimisticAssignment?: DelegatedAdminAccessAssignment) => Promise<void> | void;
    onSelectRelationshipAndAssignment?: (relationship: DelegatedAdminRelationship, assignmentId?: string) => void;
}

const defaultGetAccessToken = async (): Promise<string> => {
    const response = await window.electronAPI.getToken();
    if (!response?.accessToken) {
        throw new Error('Failed to get access token.');
    }
    return response.accessToken;
};

const CopyToClipboard: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            type="button"
            onClick={handleCopy}
            className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
            title="Copy Group ID"
        >
            {copied ? <ClipboardCheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4" />}
        </button>
    );
};

const getStatusColor = (status: DelegatedAdminRelationship['status']) => {
    switch (status) {
        case 'active':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'approvalPending':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'approved':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'terminated':
        case 'expired':
            return 'bg-gray-100 text-gray-800 border-gray-200';
        default:
            return 'bg-purple-100 text-purple-800 border-purple-200';
    }
};

const GroupAssignmentsOverview: React.FC<GroupAssignmentsOverviewProps> = ({
    searchTerm,
    relationships,
    assignmentsByRelationshipId,
    getAccessToken: propGetAccessToken,
    onAssignmentsChanged,
    onSelectRelationshipAndAssignment,
}) => {
    const getAccessToken = propGetAccessToken || defaultGetAccessToken;
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [processingKey, setProcessingKey] = useState<string | null>(null);
    const [refreshingKey, setRefreshingKey] = useState<string | null>(null);
    const [refreshedKey, setRefreshedKey] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filterQuery, setFilterQuery] = useState('');

    const roleMap = useMemo(
        () => new Map<string, UnifiedRole>(AZURE_AD_ROLES.map((role) => [role.id, role])),
        []
    );

    const normalizedMainSearch = searchTerm.trim().toLowerCase();

    // Collect all matching assignments across all relationships
    const matchedItems = useMemo(() => {
        const items: GroupMatchItem[] = [];
        if (!normalizedMainSearch) return items;

        const relMap = new Map(relationships.map((r) => [r.id, r]));

        for (const [relId, assignments] of Object.entries(assignmentsByRelationshipId)) {
            const rel = relMap.get(relId);
            if (!rel) continue;

            for (const assignment of assignments) {
                const groupName = assignment.accessContainer.displayName || '';
                const groupId = assignment.accessContainer.accessContainerId || '';

                if (
                    groupName.toLowerCase().includes(normalizedMainSearch) ||
                    groupId.toLowerCase().includes(normalizedMainSearch)
                ) {
                    items.push({
                        key: `${rel.id}_${assignment.id}`,
                        relationship: rel,
                        assignment,
                    });
                }
            }
        }

        // Sort items by relationship name, then by group name
        return items.sort((a, b) => {
            const relDiff = a.relationship.displayName.localeCompare(b.relationship.displayName, 'de', {
                sensitivity: 'base',
            });
            if (relDiff !== 0) return relDiff;
            const nameA = a.assignment.accessContainer.displayName || '';
            const nameB = b.assignment.accessContainer.displayName || '';
            return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
        });
    }, [normalizedMainSearch, relationships, assignmentsByRelationshipId]);

    // Optional local filtering within the results
    const filteredItems = useMemo(() => {
        const query = filterQuery.trim().toLowerCase();
        if (!query) return matchedItems;

        return matchedItems.filter(
            (item) =>
                (item.assignment.accessContainer.displayName || '').toLowerCase().includes(query) ||
                item.assignment.accessContainer.accessContainerId.toLowerCase().includes(query) ||
                item.relationship.displayName.toLowerCase().includes(query) ||
                item.relationship.customer.tenantId.toLowerCase().includes(query)
        );
    }, [matchedItems, filterQuery]);

    const distinctRelationshipsCount = useMemo(() => {
        return new Set(filteredItems.map((item) => item.relationship.id)).size;
    }, [filteredItems]);

    const toggleExpand = (key: string) => {
        setExpandedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleExpandAll = () => {
        setExpandedKeys(new Set(filteredItems.map((item) => item.key)));
    };

    const handleCollapseAll = () => {
        setExpandedKeys(new Set());
    };

    const handleRemoveAssignment = async (item: GroupMatchItem) => {
        if (
            !window.confirm(
                `Are you sure you want to remove this assignment "${item.assignment.accessContainer.displayName || 'Unnamed Group'}" from ${item.relationship.displayName}?`
            )
        ) {
            return;
        }

        const etag = item.assignment['@odata.etag'];
        if (!etag) {
            setError('Assignment ETag is missing. Please refresh.');
            return;
        }

        setProcessingKey(item.key);
        setError(null);
        try {
            const token = await getAccessToken();
            await deleteGDAPAccessAssignment(item.relationship.id, item.assignment.id, etag, token);
            setFeedbackMessage('Removed assignment successfully.');
            setTimeout(() => setFeedbackMessage(null), 4000);
            await onAssignmentsChanged(item.relationship.id);
        } catch (err: any) {
            setError(err.message || 'Failed to remove assignment.');
        } finally {
            setProcessingKey(null);
        }
    };

    const handleRefreshSingleAssignment = async (item: GroupMatchItem) => {
        setRefreshingKey(item.key);
        setError(null);
        try {
            await onAssignmentsChanged(item.relationship.id);
            setRefreshedKey(item.key);
            setTimeout(() => {
                setRefreshedKey((prev) => (prev === item.key ? null : prev));
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to refresh assignment.');
        } finally {
            setRefreshingKey(null);
        }
    };

    const allAreExpanded = filteredItems.length > 0 && filteredItems.every((item) => expandedKeys.has(item.key));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Feedback & Error */}
            {feedbackMessage && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-bold animate-pulse">
                    {feedbackMessage}
                </div>
            )}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold">
                    {error}
                </div>
            )}

            {/* Header */}
            <header className="border-b border-gray-100 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-gray-900 break-words leading-tight">
                                Access Assignments Search
                            </h2>
                            {searchTerm && (
                                <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    "{searchTerm}"
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {matchedItems.length} matching security group assignment{matchedItems.length === 1 ? '' : 's'} across{' '}
                            {distinctRelationshipsCount} relationship{distinctRelationshipsCount === 1 ? '' : 's'}.
                        </p>
                    </div>

                    {matchedItems.length > 0 && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={allAreExpanded ? handleCollapseAll : handleExpandAll}
                                className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-sm transition-all"
                            >
                                {allAreExpanded ? 'Collapse All Roles' : 'Expand All Roles'}
                            </button>
                        </div>
                    )}
                </div>

                {matchedItems.length > 5 && (
                    <div className="relative mt-4">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Refine search within matching results..."
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50"
                        />
                    </div>
                )}
            </header>

            {/* Results List */}
            {filteredItems.length > 0 ? (
                <ul className="grid grid-cols-1 gap-4">
                    {filteredItems.map((item) => {
                        const isEditing = editingKey === item.key;
                        const isExpanded = expandedKeys.has(item.key);
                        const roles = item.assignment.accessDetails.unifiedRoles;
                        const isProcessing = processingKey === item.key;

                        if (isEditing) {
                            return (
                                <li key={item.key} className="animate-in zoom-in-95 duration-200">
                                    <div className="mb-2 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-xs font-bold text-indigo-900 truncate">
                                                {item.relationship.displayName}
                                            </span>
                                            <span className="text-[11px] text-gray-500 font-mono">
                                                ({item.relationship.customer.tenantId})
                                            </span>
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusColor(
                                                item.relationship.status
                                            )}`}
                                        >
                                            {item.relationship.status}
                                        </span>
                                    </div>
                                    <AssignmentForm
                                        relationshipId={item.relationship.id}
                                        existingAssignment={item.assignment}
                                        onSave={async (saved) => {
                                            setEditingKey(null);
                                            setFeedbackMessage('Assignment updated successfully.');
                                            setTimeout(() => setFeedbackMessage(null), 4000);
                                            await onAssignmentsChanged(item.relationship.id, saved);
                                        }}
                                        onCancel={() => setEditingKey(null)}
                                        getAccessToken={getAccessToken}
                                        allowedRoleIds={item.relationship.accessDetails?.unifiedRoles?.map(
                                            (r) => r.roleDefinitionId
                                        )}
                                    />
                                </li>
                            );
                        }

                        return (
                            <li
                                key={item.key}
                                className="group border border-gray-200 rounded-2xl bg-white overflow-hidden hover:shadow-xl hover:border-indigo-100 transition-all duration-300"
                            >
                                <div className="p-4 sm:p-5 bg-white">
                                    {/* Relationship Context Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {onSelectRelationshipAndAssignment ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onSelectRelationshipAndAssignment(
                                                            item.relationship,
                                                            item.assignment.id
                                                        )
                                                    }
                                                    className="font-bold text-xs text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg truncate max-w-[320px] transition-colors text-left"
                                                    title="Open full relationship in Assignment Editor"
                                                >
                                                    {item.relationship.displayName}
                                                </button>
                                            ) : (
                                                <span
                                                    className="font-bold text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg truncate max-w-[320px]"
                                                    title={item.relationship.displayName}
                                                >
                                                    {item.relationship.displayName}
                                                </span>
                                            )}
                                            <span className="text-[11px] text-gray-400 font-mono">
                                                Tenant: {item.relationship.customer.tenantId}
                                            </span>
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusColor(
                                                item.relationship.status
                                            )}`}
                                        >
                                            {item.relationship.status}
                                        </span>
                                    </div>

                                    {/* Group Info + Actions */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center min-w-0 flex-1">
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-black text-gray-900 text-lg leading-tight break-words">
                                                    {item.assignment.accessContainer.displayName || 'Unnamed Group'}
                                                </span>
                                                <div className="flex items-center text-[11px] text-gray-400 font-mono mt-1">
                                                    <span className="truncate max-w-[260px]">
                                                        {item.assignment.accessContainer.accessContainerId}
                                                    </span>
                                                    <CopyToClipboard
                                                        text={item.assignment.accessContainer.accessContainerId}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 flex-shrink-0 self-end sm:self-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRefreshSingleAssignment(item)}
                                                disabled={isProcessing || refreshingKey === item.key}
                                                className={`text-sm px-3.5 py-2 font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5 ${
                                                    refreshedKey === item.key
                                                        ? 'bg-green-100 text-green-800 border border-green-300'
                                                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                                                }`}
                                                title="Refresh this security group assignment from Microsoft Graph"
                                            >
                                                {refreshingKey === item.key ? (
                                                    <>
                                                        <SpinnerIcon className="animate-spin h-4 w-4 text-indigo-600" />
                                                        <span>Refreshing...</span>
                                                    </>
                                                ) : refreshedKey === item.key ? (
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
                                            <button
                                                type="button"
                                                onClick={() => setEditingKey(item.key)}
                                                disabled={isProcessing || refreshingKey === item.key}
                                                className="text-sm px-4 py-2 font-black text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all active:scale-95"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAssignment(item)}
                                                disabled={isProcessing || refreshingKey === item.key}
                                                className="text-sm px-4 py-2 font-black text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all active:scale-95"
                                            >
                                                {isProcessing ? (
                                                    <SpinnerIcon className="animate-spin h-4 w-4" />
                                                ) : (
                                                    'Remove'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Roles Accordion Section */}
                                <div className="border-t border-gray-50 bg-gray-50/20">
                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(item.key)}
                                        className="w-full p-4 flex justify-between items-center text-left hover:bg-indigo-50/40 transition-colors"
                                    >
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                            {roles.length} Roles Assigned
                                        </span>
                                        <ChevronDownIcon
                                            className={`h-4 w-4 text-gray-400 transition-transform duration-500 ${
                                                isExpanded ? 'rotate-180 text-indigo-600' : ''
                                            }`}
                                        />
                                    </button>
                                    {isExpanded && (
                                        <div className="px-4 pb-5 flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-300">
                                            {[...roles]
                                                .sort((r1, r2) => {
                                                    const name1 =
                                                        roleMap.get(r1.roleDefinitionId)?.displayName ||
                                                        r1.roleDefinitionId;
                                                    const name2 =
                                                        roleMap.get(r2.roleDefinitionId)?.displayName ||
                                                        r2.roleDefinitionId;
                                                    return name1.localeCompare(name2, 'de', { sensitivity: 'base' });
                                                })
                                                .map((r) => (
                                                    <span
                                                        key={r.roleDefinitionId}
                                                        className="px-3 py-1 text-[11px] font-bold bg-white text-gray-700 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                                                    >
                                                        {roleMap.get(r.roleDefinitionId)?.displayName ||
                                                            'Unknown Role'}
                                                    </span>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                    <div className="mx-auto h-12 w-12 text-gray-300 mb-4 flex items-center justify-center">
                        <SearchIcon className="h-10 w-10 text-gray-300" />
                    </div>
                    <p className="text-gray-600 font-bold text-base">No matching security groups found</p>
                    <p className="text-gray-400 text-xs mt-1">
                        No active assignments contain "{searchTerm}" in their security group name.
                    </p>
                </div>
            )}
        </div>
    );
};

export default GroupAssignmentsOverview;
