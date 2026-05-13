import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DelegatedAdminRelationship } from '../types';
import { getGDAPRelationships, getGDAPAssignmentsWithGroupDisplayNames } from '../services/graphService';
import SpinnerIcon from './icons/SpinnerIcon';

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

const OverviewPage: React.FC = () => {
    const [rows, setRows] = useState<RowData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadedCount, setLoadedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const getAccessToken = useCallback(async () => {
        const response = await window.electronAPI.getToken();
        if (!response?.accessToken) throw new Error('Failed to get access token.');
        return response.accessToken;
    }, []);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setRows([]);
            setLoadedCount(0);
            setTotalCount(0);
            setError(null);

            try {
                const token = await getAccessToken();
                const relationships = await getGDAPRelationships(token);
                if (cancelled) return;

                setTotalCount(relationships.length);

                const collectedRows: RowData[] = new Array(relationships.length);

                await Promise.all(
                    relationships.map(async (r, i) => {
                        try {
                            const assignments = await getGDAPAssignmentsWithGroupDisplayNames(r.id, token);
                            const groupNames = new Set<string>(
                                assignments
                                    .filter(a => a.accessContainer.displayName)
                                    .map(a => a.accessContainer.displayName as string)
                            );
                            collectedRows[i] = { relationship: r, groupNames };
                        } catch {
                            collectedRows[i] = { relationship: r, groupNames: new Set() };
                        } finally {
                            if (!cancelled) setLoadedCount(prev => prev + 1);
                        }
                    })
                );

                if (!cancelled) {
                    const sorted = collectedRows
                        .filter(Boolean)
                        .sort((a, b) =>
                            a.relationship.displayName.localeCompare(b.relationship.displayName, 'de', { sensitivity: 'base' })
                        );
                    setRows(sorted);
                    setIsLoading(false);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err.message || 'Failed to load overview.');
                    setIsLoading(false);
                }
            }
        };

        load();
        return () => { cancelled = true; };
    }, [getAccessToken]);

    const columnGroups = useMemo((): ColumnGroup[] => {
        const allGroupNames = new Set<string>();
        rows.forEach(r => r.groupNames.forEach(n => allGroupNames.add(n)));

        const groupMap = new Map<string, string[]>();
        allGroupNames.forEach(name => {
            const base = getGroupBaseName(name);
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

    const totalGroupCols = families.length;

    // ── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        const pct = totalCount > 0 ? (loadedCount / totalCount) * 100 : 0;
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white shadow-lg rounded-lg min-h-[400px] gap-5">
                <SpinnerIcon className="h-10 w-10 animate-spin text-indigo-600" />
                <span className="text-gray-600 font-bold uppercase tracking-widest text-sm">
                    Loading overview{totalCount > 0 ? ` — ${loadedCount} / ${totalCount} relationships` : '…'}
                </span>
                {totalCount > 0 && (
                    <div className="w-80">
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                            <span>Fetching assignment data</span>
                            <span>{Math.round(pct)} %</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
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
                    {rows.length} relationships · {totalGroupCols} unique groups in {columnGroups.length} families
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OverviewPage;
