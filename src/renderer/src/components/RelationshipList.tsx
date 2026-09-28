import React, { useState, useMemo } from 'react';
import { DelegatedAdminRelationship, DelegatedAdminAccessAssignment } from '../types';
import SearchIcon from './icons/SearchIcon';
import XIcon from './icons/XIcon';

interface RelationshipListProps {
    relationships: DelegatedAdminRelationship[];
    selectedRelationshipId: string | null;
    onSelectRelationship: (relationship: DelegatedAdminRelationship | null) => void;
    assignmentCounts?: Record<string, number>;
    relationshipGroupNames?: Record<string, string[]>;
    assignmentsByRelationshipId?: Record<string, DelegatedAdminAccessAssignment[]>;
    isPreloading?: boolean;
    preloadDone?: number;
    preloadTotal?: number;
    searchMode?: 'relationship' | 'group';
    onSearchModeChange?: (mode: 'relationship' | 'group') => void;
    groupSearchTerm?: string;
    onGroupSearchTermChange?: (term: string) => void;
    onSelectAllGroupMatches?: () => void;
    isAllGroupMatchesSelected?: boolean;
}

const RelationshipList: React.FC<RelationshipListProps> = ({
    relationships,
    selectedRelationshipId,
    onSelectRelationship,
    assignmentCounts,
    relationshipGroupNames = {},
    assignmentsByRelationshipId = {},
    isPreloading,
    preloadDone = 0,
    preloadTotal = 0,
    searchMode = 'relationship',
    onSearchModeChange,
    groupSearchTerm = '',
    onGroupSearchTermChange,
    onSelectAllGroupMatches,
    isAllGroupMatchesSelected = false,
}) => {
    const [relationshipFilter, setRelationshipFilter] = useState('');

    const isTerminated = (s: string) => (s === 'terminated' || s === 'terminating' ? 1 : 0);

    // Filter relationships for standard "relationship" mode
    const filteredRelationships = useMemo(() => {
        const filtered = !relationshipFilter.trim()
            ? relationships
            : relationships.filter(
                  (r) =>
                      r.displayName.toLowerCase().includes(relationshipFilter.toLowerCase()) ||
                      r.customer.tenantId.toLowerCase().includes(relationshipFilter.toLowerCase())
              );
        return [...filtered].sort((a, b) => {
            const termDiff = isTerminated(a.status) - isTerminated(b.status);
            if (termDiff !== 0) return termDiff;
            return a.displayName.localeCompare(b.displayName, 'de', { sensitivity: 'base' });
        });
    }, [relationships, relationshipFilter]);

    // Group-based matching calculation for "group" mode
    const groupMatches = useMemo(() => {
        const query = groupSearchTerm.trim().toLowerCase();
        if (!query) {
            return {
                matchedRelationships: [] as {
                    relationship: DelegatedAdminRelationship;
                    matchingGroups: string[];
                }[],
                totalMatchingAssignments: 0,
            };
        }

        const list: { relationship: DelegatedAdminRelationship; matchingGroups: string[] }[] = [];
        let totalCount = 0;

        for (const r of relationships) {
            const assignments = assignmentsByRelationshipId[r.id] || [];
            const namesFromState = relationshipGroupNames[r.id] || [];

            const matchedGroupNames = new Set<string>();

            // Check assignments objects (display names and IDs)
            for (const a of assignments) {
                const dName = a.accessContainer.displayName || '';
                const cId = a.accessContainer.accessContainerId || '';
                if (dName.toLowerCase().includes(query) || cId.toLowerCase().includes(query)) {
                    matchedGroupNames.add(dName || cId);
                }
            }

            // Check names from groupNames mapping
            for (const name of namesFromState) {
                if (name.toLowerCase().includes(query)) {
                    matchedGroupNames.add(name);
                }
            }

            if (matchedGroupNames.size > 0) {
                const groupList = Array.from(matchedGroupNames).sort((a, b) =>
                    a.localeCompare(b, 'de', { sensitivity: 'base' })
                );
                totalCount += groupList.length;
                list.push({
                    relationship: r,
                    matchingGroups: groupList,
                });
            }
        }

        list.sort((a, b) => {
            const termDiff = isTerminated(a.relationship.status) - isTerminated(b.relationship.status);
            if (termDiff !== 0) return termDiff;
            return a.relationship.displayName.localeCompare(b.relationship.displayName, 'de', { sensitivity: 'base' });
        });

        return {
            matchedRelationships: list,
            totalMatchingAssignments: totalCount,
        };
    }, [groupSearchTerm, relationships, assignmentsByRelationshipId, relationshipGroupNames]);

    // Unique popular group family suggestions for quick filtering
    const popularGroupSuggestions = useMemo(() => {
        const allNames = Object.values(relationshipGroupNames).flat();
        const baseNames = new Set<string>();

        allNames.forEach((name) => {
            if (!name || name === 'Name not found') return;
            const m = name.match(/^(.*?)(-[A-Za-z0-9]+)$/);
            const base = m ? m[1] : name;
            if (base.length >= 3) {
                baseNames.add(base);
            }
        });

        ['Desktop', 'AdminAgents', 'HelpdeskAgents', 'SalesAgents'].forEach((sample) => {
            if (allNames.some((n) => n.toLowerCase().includes(sample.toLowerCase()))) {
                baseNames.add(sample);
            }
        });

        return Array.from(baseNames).slice(0, 8);
    }, [relationshipGroupNames]);

    const getStatusColor = (status: DelegatedAdminRelationship['status']) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'approvalPending':
                return 'bg-yellow-100 text-yellow-800';
            case 'approved':
                return 'bg-blue-100 text-blue-800';
            case 'terminated':
            case 'expired':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-purple-100 text-purple-800';
        }
    };

    const handleModeSwitch = (mode: 'relationship' | 'group') => {
        onSearchModeChange?.(mode);
        if (mode === 'group' && groupSearchTerm.trim()) {
            onSelectAllGroupMatches?.();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Relationships</h2>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-3">
                <button
                    type="button"
                    onClick={() => handleModeSwitch('relationship')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        searchMode === 'relationship'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                    Relationships
                </button>
                <button
                    type="button"
                    onClick={() => handleModeSwitch('group')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        searchMode === 'group'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                    Group Search
                </button>
            </div>

            {isPreloading ? (
                <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Loading assignment counts…</span>
                        <span>
                            {preloadDone} / {preloadTotal}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                            style={{
                                width: preloadTotal > 0 ? `${(preloadDone / preloadTotal) * 100}%` : '0%',
                            }}
                        />
                    </div>
                </div>
            ) : preloadTotal > 0 ? (
                <div className="mb-3 h-4" />
            ) : null}

            {/* Search Input */}
            <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                {searchMode === 'relationship' ? (
                    <>
                        <input
                            type="text"
                            placeholder="Filter by name or tenant ID..."
                            value={relationshipFilter}
                            onChange={(e) => setRelationshipFilter(e.target.value)}
                            className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        {relationshipFilter && (
                            <button
                                type="button"
                                onClick={() => setRelationshipFilter('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                title="Clear filter"
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <input
                            type="text"
                            placeholder="Search security groups (e.g. Desktop)..."
                            value={groupSearchTerm}
                            onChange={(e) => {
                                onGroupSearchTermChange?.(e.target.value);
                                if (e.target.value.trim()) {
                                    onSelectAllGroupMatches?.();
                                }
                            }}
                            className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-indigo-50/20"
                        />
                        {groupSearchTerm && (
                            <button
                                type="button"
                                onClick={() => onGroupSearchTermChange?.('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                title="Clear filter"
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* List Content */}
            <div className="flex-grow overflow-y-auto -mr-4 pr-2">
                {searchMode === 'relationship' ? (
                    filteredRelationships.length > 0 ? (
                        <ul className="space-y-2">
                            {filteredRelationships.map((r) => (
                                <li key={r.id}>
                                    <button
                                        type="button"
                                        onClick={() => onSelectRelationship(r)}
                                        className={`w-full text-left p-3 rounded-xl transition-all ${
                                            selectedRelationshipId === r.id && !isAllGroupMatchesSelected
                                                ? 'bg-indigo-100 shadow-sm border border-indigo-200'
                                                : 'hover:bg-gray-50 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-gray-900 truncate">
                                                {r.displayName}
                                                {assignmentCounts?.[r.id] !== undefined && (
                                                    <span className="ml-1.5 text-xs font-normal text-gray-500">
                                                        ({assignmentCounts[r.id]})
                                                    </span>
                                                )}
                                            </p>
                                            <span
                                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(
                                                    r.status
                                                )}`}
                                            >
                                                {r.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 font-mono">{r.customer.tenantId}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-500 text-sm">No relationships found.</p>
                        </div>
                    )
                ) : groupSearchTerm.trim() ? (
                    groupMatches.matchedRelationships.length > 0 ? (
                        <div className="space-y-3">
                            {/* All Results Card Button */}
                            <button
                                type="button"
                                onClick={() => onSelectAllGroupMatches?.()}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${
                                    isAllGroupMatchesSelected
                                        ? 'bg-indigo-600 text-white shadow-md border-indigo-700'
                                        : 'bg-indigo-50/70 hover:bg-indigo-100/70 border-indigo-200 text-indigo-900'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-sm flex items-center gap-1.5">
                                        <span>All Matching Results</span>
                                    </span>
                                    <span
                                        className={`px-2 py-0.5 text-xs font-bold rounded-lg ${
                                            isAllGroupMatchesSelected
                                                ? 'bg-indigo-700 text-white'
                                                : 'bg-white text-indigo-700 border border-indigo-200'
                                        }`}
                                    >
                                        {groupMatches.totalMatchingAssignments} Groups
                                    </span>
                                </div>
                                <p
                                    className={`text-xs mt-1 ${
                                        isAllGroupMatchesSelected ? 'text-indigo-100' : 'text-indigo-600'
                                    }`}
                                >
                                    View all matching groups across {groupMatches.matchedRelationships.length}{' '}
                                    relationships
                                </p>
                            </button>

                            {/* Relationship specific items */}
                            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1 pt-1">
                                Matching Relationships ({groupMatches.matchedRelationships.length})
                            </div>

                            <ul className="space-y-2">
                                {groupMatches.matchedRelationships.map(({ relationship: r, matchingGroups }) => (
                                    <li key={r.id}>
                                        <button
                                            type="button"
                                            onClick={() => onSelectRelationship(r)}
                                            className={`w-full text-left p-3 rounded-xl transition-all border ${
                                                selectedRelationshipId === r.id && !isAllGroupMatchesSelected
                                                    ? 'bg-indigo-100 shadow-sm border-indigo-200'
                                                    : 'hover:bg-gray-50 border-gray-100'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <p className="font-bold text-gray-900 truncate">
                                                    {r.displayName}
                                                </p>
                                                <span
                                                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(
                                                        r.status
                                                    )}`}
                                                >
                                                    {r.status}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                                                {r.customer.tenantId}
                                            </p>
                                            {/* Matching groups badges */}
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {matchingGroups.map((gName) => (
                                                    <span
                                                        key={gName}
                                                        className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md truncate max-w-[180px]"
                                                        title={gName}
                                                    >
                                                        {gName}
                                                    </span>
                                                ))}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="text-center py-10 px-3 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-600 font-bold text-sm">No matching groups found</p>
                            <p className="text-gray-400 text-xs mt-1">
                                No relationships have security groups containing "{groupSearchTerm}".
                            </p>
                        </div>
                    )
                ) : (
                    <div className="space-y-4 py-2">
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-800">
                            <p className="font-bold mb-1">Search by Security Group</p>
                            <p className="text-indigo-600">
                                Type a keyword (e.g. <span className="font-semibold underline">Desktop</span> or{' '}
                                <span className="font-semibold underline">Helpdesk</span>) above to find all security
                                groups and their role assignments across all customer relationships.
                            </p>
                        </div>

                        {popularGroupSuggestions.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-2">Popular suggestions:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {popularGroupSuggestions.map((group) => (
                                        <button
                                            key={group}
                                            type="button"
                                            onClick={() => {
                                                onGroupSearchTermChange?.(group);
                                                onSelectAllGroupMatches?.();
                                            }}
                                            className="px-2.5 py-1 text-xs font-bold bg-white text-gray-700 border border-gray-200 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-xs"
                                        >
                                            {group}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RelationshipList;
