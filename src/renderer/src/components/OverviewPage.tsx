import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DelegatedAdminRelationship } from '../types';
import { GDAPSnapshotProgress, getGDAPRelationshipsSnapshot } from '../services/graphService';
import LoadingProgressCard from './LoadingProgressCard';

interface RowData {
    relationship: DelegatedAdminRelationship;
    groupNames: Set<string>;
}

interface ColumnGroup {
    baseName: string;
    groupNames: string[];
}

interface GroupFamily {
    baseName: string;
}

/**
 * Strips a trailing dash-suffix of 1–4 uppercase letters (e.g. "-CG", "-CH", "-CM")
 * to find the "family" base name used for column grouping.
 */
function getGroupBaseName(displayName: string): string {
    const m = displayName.match(/^(.*?)(-[A-Z]{1,4})$/);
    return m ? m[1] : displayName;
}

const STANDARD_GROUPS = ['AdminAgents', 'HelpdeskAgents', 'SalesAgents'] as const;
const STANDARD_GROUPS_LOWER = new Set(STANDARD_GROUPS.map(g => g.toLowerCase()));

interface OverviewPageProps {
    refreshToken?: number;
    onRefreshStateChange?: (state: { isRefreshing: boolean; lastRefreshedAt: number | null }) => void;
}

const OverviewPage: React.FC<OverviewPageProps> = ({ refreshToken = 0, onRefreshStateChange }) => {
    const [rows, setRows] = useState<RowData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadedCount, setLoadedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [loadingLabel, setLoadingLabel] = useState('Fetching assignment data');
    const [error, setError] = useState<string | null>(null);

    const getAccessToken = useCallback(async () => {
        const response = await window.electronAPI.getToken();
        if (!response?.accessToken) throw new Error('Failed to get access token.');
        return response.accessToken;
    }, []);

    const loadOverview = useCallback(async (forceRefresh = false, isCancelled?: () => boolean) => {
        setIsLoading(true);
        setRows([]);
        setLoadedCount(0);
        setTotalCount(0);
        setLoadingLabel('Fetching assignment data');
        setError(null);
        if (forceRefresh) {
            onRefreshStateChange?.({ isRefreshing: true, lastRefreshedAt: null });
        }

        try {
            const token = await getAccessToken();
            const handleProgress = (progress: GDAPSnapshotProgress) => {
                if (isCancelled?.()) return;
                setLoadedCount(progress.current);
                setTotalCount(progress.total);
                setLoadingLabel(progress.message);
            };
            const snapshot = await getGDAPRelationshipsSnapshot(token, {
                ...(forceRefresh ? { forceRefresh: true } : {}),
                onProgress: handleProgress,
            });
            const relationships = snapshot.relationships;
            if (isCancelled?.()) return;

            setTotalCount((prev) => (prev > 0 ? prev : relationships.length));

            const collectedRows: RowData[] = relationships.map((relationship) => ({
                relationship,
                groupNames: new Set(snapshot.groupNamesByRelationshipId[relationship.id] || []),
            }));

            setLoadedCount(relationships.length);
            const sorted = collectedRows
                .filter(Boolean)
                .sort((a, b) =>
                    a.relationship.displayName.localeCompare(b.relationship.displayName, 'de', { sensitivity: 'base' })
                );
            if (isCancelled?.()) return;

            setRows(sorted);
            onRefreshStateChange?.({ isRefreshing: false, lastRefreshedAt: Date.now() });
        } catch (err: any) {
            if (isCancelled?.()) return;
            setError(err.message || 'Failed to load overview.');
            if (forceRefresh) {
                onRefreshStateChange?.({ isRefreshing: false, lastRefreshedAt: null });
            }
        } finally {
            if (isCancelled?.()) return;
            setIsLoading(false);
        }
    }, [getAccessToken, onRefreshStateChange]);

    useEffect(() => {
        let cancelled = false;
        void loadOverview(false, () => cancelled);
        return () => {
            cancelled = true;
        };
    }, [loadOverview]);

    useEffect(() => {
        if (refreshToken <= 0) return;
        let cancelled = false;
        void loadOverview(true, () => cancelled);
        return () => {
            cancelled = true;
        };
    }, [loadOverview, refreshToken]);

    const columnGroups = useMemo((): ColumnGroup[] => {
        const allGroupNames = new Set<string>();
        rows.forEach(r => r.groupNames.forEach(n => allGroupNames.add(n)));

        const groupMap = new Map<string, string[]>();
        allGroupNames.forEach(name => {
            const base = getGroupBaseName(name);
            // Standard agent groups are rendered as fixed last columns — skip here
            if (STANDARD_GROUPS_LOWER.has(base.toLowerCase())) return;
            if (!groupMap.has(base)) groupMap.set(base, []);
            groupMap.get(base)!.push(name);
        });

        return Array.from(groupMap.entries())
            .sort(([a], [b]) => a.localeCompare(b, 'de', { sensitivity: 'base' }))
            .map(([baseName, names]) => ({
                baseName,
                groupNames: names.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' })),
            }));
    }, [rows]);

    const families = useMemo((): GroupFamily[] => {
        return columnGroups.map(cg => ({ baseName: cg.baseName }));
    }, [columnGroups]);

    const totalGroupCols = families.length + STANDARD_GROUPS.length;

    // ── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <LoadingProgressCard
                title={`Loading overview${totalCount > 0 ? ` — ${loadedCount} / ${totalCount} elements` : '…'}`}
                progressLabel={loadingLabel}
                current={loadedCount}
                total={totalCount}
            />
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-semibold">Failed to load overview</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
        );
    }

    if (rows.length === 0) {
        return <div className="text-center py-10 text-gray-500">No relationships found.</div>;
    }

    // ── Table ────────────────────────────────────────────────────────────────
    return (
        <div className="bg-white shadow-lg rounded-lg p-4 md:p-6">
            <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Assignment Overview</h2>
                <span className="text-sm text-gray-500">
                    {rows.length} relationships · {columnGroups.length} families + {STANDARD_GROUPS.length} standard groups
                </span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mb-4 text-xs">
                <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-4 rounded bg-green-100 border border-green-200" />
                    <span className="text-gray-600">Group found</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-4 rounded bg-rose-100 border border-rose-200" />
                    <span className="text-gray-600">Missing group for this family</span>
                </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="border-collapse text-xs min-w-full">
                    <thead className="sticky top-0 z-20">
                        <tr>
                            <th
                                className="sticky left-0 z-30 bg-indigo-700 border border-indigo-600 px-4 py-3 text-left font-semibold text-white min-w-[220px] align-bottom"
                            >
                                Admin Relationship
                            </th>
                            {families.map(family => (
                                <th
                                    key={family.baseName}
                                    className="border border-indigo-200 px-2 py-1.5 text-center font-semibold text-indigo-900 bg-indigo-50 whitespace-nowrap"
                                    title={family.baseName}
                                >
                                    <div className="max-w-[160px] truncate mx-auto">
                                        {family.baseName}
                                    </div>
                                </th>
                            ))}
                            {/* Standard agent groups — fixed last 3 columns */}
                            {STANDARD_GROUPS.map(sg => (
                                <th
                                    key={sg}
                                    className="border border-amber-300 px-2 py-1.5 text-center font-semibold text-amber-900 bg-amber-50 whitespace-nowrap"
                                    title={sg}
                                >
                                    <div className="max-w-[140px] truncate mx-auto">{sg}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIdx) => (
                            <tr
                                key={row.relationship.id}
                                className={rowIdx % 2 === 0 ? 'bg-white hover:bg-indigo-50/30' : 'bg-gray-50/60 hover:bg-indigo-50/30'}
                            >
                                {/* Sticky relationship name cell */}
                                <td
                                    className={`sticky left-0 z-10 border border-gray-200 px-4 py-1.5 font-medium text-gray-800 whitespace-nowrap ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                >
                                    {row.relationship.displayName}
                                </td>

                                {families.map(family => {
                                    const matchingNames = [...row.groupNames]
                                        .filter(name => name.startsWith(`${family.baseName}-`) || name === family.baseName)
                                        .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
                                    const cellValue = matchingNames[0];
                                    const isMissing = !cellValue;

                                    return (
                                        <td
                                            key={family.baseName}
                                            title={cellValue || `Missing: ${family.baseName}*`}
                                            className={`border border-gray-200 px-2 py-1.5 transition-colors ${
                                                isMissing ? 'bg-rose-50' : 'bg-green-50'
                                            }`}
                                        >
                                            {isMissing ? (
                                                <span className="text-rose-700 font-semibold">Missing</span>
                                            ) : (
                                                <span className="text-green-800 font-medium whitespace-nowrap">{cellValue}</span>
                                            )}
                                        </td>
                                    );
                                })}
                                {/* Standard agent group cells */}
                                {STANDARD_GROUPS.map(sg => {
                                    const found = [...row.groupNames].some(
                                        n => n.toLowerCase() === sg.toLowerCase()
                                    );
                                    return (
                                        <td
                                            key={sg}
                                            title={found ? sg : `Missing: ${sg}`}
                                            className={`border border-amber-200 px-2 py-1.5 transition-colors ${
                                                found ? 'bg-green-50' : 'bg-rose-50'
                                            }`}
                                        >
                                            {found ? (
                                                <span className="text-green-800 font-medium whitespace-nowrap">{sg}</span>
                                            ) : (
                                                <span className="text-rose-700 font-semibold">Missing</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OverviewPage;
