import React, { useState, useEffect, useCallback } from 'react';
import { DelegatedAdminRelationship, DelegatedAdminAccessAssignment } from '../types';
import {
    GDAPSnapshotProgress,
    getGDAPRelationshipsSnapshot,
    getGDAPAssignmentsWithGroupDisplayNames,
} from '../services/graphService';
import RelationshipList from './RelationshipList';
import AssignmentEditor from './AssignmentEditor';
import GroupAssignmentsOverview from './GroupAssignmentsOverview';
import LoadingProgressCard from './LoadingProgressCard';

interface ManageAssignmentsProps {
    refreshToken?: number;
    onRefreshStateChange?: (state: { isRefreshing: boolean; lastRefreshedAt: number | null }) => void;
}

const ManageAssignments: React.FC<ManageAssignmentsProps> = ({ refreshToken = 0, onRefreshStateChange }) => {
    const [relationships, setRelationships] = useState<DelegatedAdminRelationship[]>([]);
    const [selectedRelationship, setSelectedRelationship] = useState<DelegatedAdminRelationship | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
    const [relationshipGroupNames, setRelationshipGroupNames] = useState<Record<string, string[]>>({});
    const [assignmentsByRelationshipId, setAssignmentsByRelationshipId] = useState<Record<string, DelegatedAdminAccessAssignment[]>>({});
    const [isPreloading, setIsPreloading] = useState(false);
    const [preloadDone, setPreloadDone] = useState(0);
    const [preloadTotal, setPreloadTotal] = useState(0);
    const [hasCompletedInitialLoad, setHasCompletedInitialLoad] = useState(false);
    const [loadingCurrent, setLoadingCurrent] = useState(0);
    const [loadingTotal, setLoadingTotal] = useState(0);
    const [loadingLabel, setLoadingLabel] = useState('Collecting active role assignments');

    // Group Search Filter States
    const [searchMode, setSearchMode] = useState<'relationship' | 'group'>('relationship');
    const [groupSearchTerm, setGroupSearchTerm] = useState('');
    const [isAllGroupMatchesSelected, setIsAllGroupMatchesSelected] = useState(false);
    const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

    const getAccessToken = useCallback(async () => {
        const response = await window.electronAPI.getToken();
        if (!response?.accessToken) {
            throw new Error('Failed to get access token.');
        }
        return response.accessToken;
    }, []);

    const preloadRelationshipData = useCallback(async (rels: DelegatedAdminRelationship[], baseCurrent = 0, baseTotal = 0) => {
        if (rels.length === 0) return;
        setIsPreloading(true);
        setPreloadDone(0);
        setPreloadTotal(rels.length);
        setAssignmentCounts({});
        setRelationshipGroupNames({});
        setAssignmentsByRelationshipId({});
        setLoadingLabel('Preparing tenant assignment data');
        setLoadingCurrent(baseCurrent);
        setLoadingTotal(baseTotal > 0 ? baseTotal + rels.length : rels.length);
        try {
            const token = await getAccessToken();
            const snapshot = await getGDAPRelationshipsSnapshot(token);
            let nextAssignmentCounts: Record<string, number> = {};
            let nextRelationshipGroupNames: Record<string, string[]> = {};
            let nextAssignmentsByRelationshipId: Record<string, DelegatedAdminAccessAssignment[]> = snapshot.assignmentsByRelationshipId || {};
            let completed = 0;

            for (const relationship of rels) {
                const assignments = snapshot.assignmentsByRelationshipId[relationship.id] || [];
                nextAssignmentCounts = {
                    ...nextAssignmentCounts,
                    [relationship.id]: assignments.length,
                };
                nextRelationshipGroupNames = {
                    ...nextRelationshipGroupNames,
                    [relationship.id]: snapshot.groupNamesByRelationshipId[relationship.id] || [],
                };
                nextAssignmentsByRelationshipId = {
                    ...nextAssignmentsByRelationshipId,
                    [relationship.id]: assignments,
                };

                setAssignmentCounts(nextAssignmentCounts);
                setRelationshipGroupNames(nextRelationshipGroupNames);
                setAssignmentsByRelationshipId(nextAssignmentsByRelationshipId);
                setPreloadDone((prev) => prev + 1);
                completed += 1;
                setLoadingCurrent(baseCurrent + completed);

                await Promise.resolve();
            }
        } catch {
            // Fehler beim Preload ignorieren
        } finally {
            setIsPreloading(false);
        }
    }, [getAccessToken]);

    const fetchRelationships = useCallback(async (forceRefresh = false) => {
        setIsLoading(true);
        setError(null);
        setLoadingCurrent(0);
        setLoadingTotal(0);
        setLoadingLabel('Collecting active role assignments');
        onRefreshStateChange?.({ isRefreshing: forceRefresh, lastRefreshedAt: null });
        try {
            const token = await getAccessToken();
            let snapshotCurrent = 0;
            let snapshotTotal = 0;
            const handleProgress = (progress: GDAPSnapshotProgress) => {
                snapshotCurrent = progress.current;
                snapshotTotal = progress.total;
                setLoadingCurrent(progress.current);
                setLoadingTotal(progress.total);
                setLoadingLabel(progress.message);
            };
            const snapshot = await getGDAPRelationshipsSnapshot(token, {
                ...(forceRefresh ? { forceRefresh: true } : {}),
                onProgress: handleProgress,
            });
            const data = snapshot.relationships;
            setRelationships(data);
            setAssignmentsByRelationshipId(snapshot.assignmentsByRelationshipId || {});
            setRelationshipGroupNames(snapshot.groupNamesByRelationshipId || {});

            setSelectedRelationship((current) => {
                if (!current) return current;
                return data.find((relationship) => relationship.id === current.id) || null;
            });
            await preloadRelationshipData(data, snapshotCurrent || data.length, snapshotTotal || data.length);
            setHasCompletedInitialLoad(true);
            onRefreshStateChange?.({ isRefreshing: false, lastRefreshedAt: Date.now() });
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching relationships.');
            setHasCompletedInitialLoad(true);
            onRefreshStateChange?.({ isRefreshing: false, lastRefreshedAt: null });
        } finally {
            setIsLoading(false);
        }
    }, [getAccessToken, onRefreshStateChange, preloadRelationshipData]);

    useEffect(() => {
        void fetchRelationships();
    }, [fetchRelationships]);

    useEffect(() => {
        if (refreshToken <= 0) return;
        setSelectedRelationship(null);
        setIsAllGroupMatchesSelected(false);
        setEditingAssignmentId(null);
        void fetchRelationships(true);
    }, [fetchRelationships, refreshToken]);

    const handleUpdateRelationship = (updated: DelegatedAdminRelationship) => {
        setRelationships(prev => prev.map(r => r.id === updated.id ? updated : r));
        setSelectedRelationship(updated);
    };

    const handleAssignmentsLoaded = useCallback(
        (
            relationshipId: string,
            count: number,
            groupNames?: string[],
            assignments?: DelegatedAdminAccessAssignment[]
        ) => {
            setAssignmentCounts(prev => ({ ...prev, [relationshipId]: count }));
            if (groupNames) {
                setRelationshipGroupNames(prev => ({ ...prev, [relationshipId]: groupNames }));
            }
            if (assignments) {
                setAssignmentsByRelationshipId(prev => ({ ...prev, [relationshipId]: assignments }));
            }
        },
        []
    );

    const refreshRelationshipAssignments = useCallback(
        async (relationshipId: string, optimisticAssignment?: DelegatedAdminAccessAssignment) => {
            if (optimisticAssignment) {
                setAssignmentsByRelationshipId((prev) => {
                    const currentList = prev[relationshipId] || [];
                    const exists = currentList.some((a) => a.id === optimisticAssignment.id);
                    const nextList = exists
                        ? currentList.map((a) => (a.id === optimisticAssignment.id ? optimisticAssignment : a))
                        : [...currentList, optimisticAssignment];
                    return {
                        ...prev,
                        [relationshipId]: nextList,
                    };
                });
                setRelationshipGroupNames((prev) => {
                    const groupName = optimisticAssignment.accessContainer.displayName;
                    const existingNames = prev[relationshipId] || [];
                    if (groupName && groupName !== 'Name not found' && !existingNames.includes(groupName)) {
                        return {
                            ...prev,
                            [relationshipId]: [...existingNames, groupName],
                        };
                    }
                    return prev;
                });
                return;
            }

            try {
                const token = await getAccessToken();
                const freshAssignments = await getGDAPAssignmentsWithGroupDisplayNames(relationshipId, token, true);
                const groupNames = freshAssignments
                    .map((a) => a.accessContainer.displayName)
                    .filter((name): name is string => !!name && name !== 'Name not found');

                setAssignmentsByRelationshipId((prev) => ({
                    ...prev,
                    [relationshipId]: freshAssignments,
                }));
                setRelationshipGroupNames((prev) => ({
                    ...prev,
                    [relationshipId]: groupNames,
                }));
                setAssignmentCounts((prev) => ({
                    ...prev,
                    [relationshipId]: freshAssignments.length,
                }));
            } catch (err) {
                console.error('Failed to reload assignments for relationship', relationshipId, err);
            }
        },
        [getAccessToken]
    );

    const handleSelectRelationship = (rel: DelegatedAdminRelationship | null) => {
        setSelectedRelationship(rel);
        setIsAllGroupMatchesSelected(false);
        setEditingAssignmentId(null);
    };

    const handleSelectAllGroupMatches = () => {
        setIsAllGroupMatchesSelected(true);
        setSelectedRelationship(null);
        setEditingAssignmentId(null);
    };

    const handleSelectRelationshipAndAssignment = (rel: DelegatedAdminRelationship, assignmentId?: string) => {
        setSelectedRelationship(rel);
        setIsAllGroupMatchesSelected(false);
        setEditingAssignmentId(assignmentId || null);
    };

    if (!hasCompletedInitialLoad && (isLoading || isPreloading)) {
        return (
            <LoadingProgressCard
                title={`Loading relationships${loadingTotal > 0 ? ` - ${loadingCurrent} / ${loadingTotal} elements` : '...'}`}
                progressLabel={loadingLabel}
                current={loadingCurrent}
                total={loadingTotal}
                spinnerSizeClassName="h-12 w-12"
            />
        );
    }
    
    if (error && relationships.length === 0) {
        return (
            <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-semibold">Failed to load data</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button 
                    onClick={() => { void fetchRelationships(true); }} 
                    className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const shouldShowGroupOverview = searchMode === 'group' && isAllGroupMatchesSelected && groupSearchTerm.trim().length > 0;

    return (
        <div className="bg-white shadow-lg rounded-lg p-4 md:p-6 min-h-[600px]">
            <div className="flex gap-6 min-h-[520px]">
                <div className="flex-none border-r border-gray-100 pr-4" style={{ minWidth: '400px' }}>
                    <RelationshipList 
                        relationships={relationships}
                        selectedRelationshipId={selectedRelationship?.id || null}
                        onSelectRelationship={handleSelectRelationship}
                        assignmentCounts={assignmentCounts}
                        relationshipGroupNames={relationshipGroupNames}
                        assignmentsByRelationshipId={assignmentsByRelationshipId}
                        isPreloading={isPreloading}
                        preloadDone={preloadDone}
                        preloadTotal={preloadTotal}
                        searchMode={searchMode}
                        onSearchModeChange={setSearchMode}
                        groupSearchTerm={groupSearchTerm}
                        onGroupSearchTermChange={setGroupSearchTerm}
                        onSelectAllGroupMatches={handleSelectAllGroupMatches}
                        isAllGroupMatchesSelected={isAllGroupMatchesSelected}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    {shouldShowGroupOverview ? (
                        <GroupAssignmentsOverview 
                            searchTerm={groupSearchTerm}
                            relationships={relationships}
                            assignmentsByRelationshipId={assignmentsByRelationshipId}
                            getAccessToken={getAccessToken}
                            onAssignmentsChanged={refreshRelationshipAssignments}
                            onSelectRelationshipAndAssignment={handleSelectRelationshipAndAssignment}
                        />
                    ) : (
                        <AssignmentEditor 
                            key={selectedRelationship?.id} 
                            relationship={selectedRelationship} 
                            getAccessToken={getAccessToken}
                            onUpdateRelationship={handleUpdateRelationship}
                            onAssignmentsLoaded={handleAssignmentsLoaded}
                            allRelationshipGroupNames={relationshipGroupNames}
                            initialEditingAssignmentId={editingAssignmentId}
                            onBackToGroupOverview={
                                searchMode === 'group' && groupSearchTerm.trim().length > 0
                                    ? handleSelectAllGroupMatches
                                    : undefined
                            }
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageAssignments;
