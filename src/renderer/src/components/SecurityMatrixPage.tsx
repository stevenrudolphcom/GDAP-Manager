import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GDAPSnapshotProgress, getGDAPRelationshipsSnapshot } from '../services/graphService';
import { AZURE_AD_ROLES } from '../constants';
import LoadingProgressCard from './LoadingProgressCard';

interface MatrixRow {
    groupName: string;
    roleIds: Set<string>;
}

interface SecurityMatrixPageProps {
    refreshToken?: number;
    onRefreshStateChange?: (state: { isRefreshing: boolean; lastRefreshedAt: number | null }) => void;
}

const GROUP_FAMILY_PALETTE = [
    { light: '#E0F2FE', dark: '#BAE6FD' },
    { light: '#EDE9FE', dark: '#DDD6FE' },
    { light: '#ECFDF5', dark: '#D1FAE5' },
    { light: '#FEF3C7', dark: '#FDE68A' },
    { light: '#FCE7F3', dark: '#FBCFE8' },
    { light: '#F3E8FF', dark: '#E9D5FF' },
    { light: '#E0E7FF', dark: '#C7D2FE' },
    { light: '#DCFCE7', dark: '#BBF7D0' },
] as const;

function getGroupFamilyName(groupName: string): string {
    const idx = groupName.lastIndexOf('-');
    if (idx <= 0) return groupName;
    return groupName.slice(0, idx);
}

function toCsvValue(value: string): string {
    const escapedValue = value.replace(/"/g, '""');
    return /[";\r\n]/.test(escapedValue) ? `"${escapedValue}"` : escapedValue;
}

const SecurityMatrixPage: React.FC<SecurityMatrixPageProps> = ({ refreshToken = 0, onRefreshStateChange }) => {
    const [rows, setRows] = useState<MatrixRow[]>([]);
    const [columnRoleIds, setColumnRoleIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadedCount, setLoadedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [loadingLabel, setLoadingLabel] = useState('Collecting active role assignments');
    const [error, setError] = useState<string | null>(null);
    const [groupNameFilter, setGroupNameFilter] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    const roleDisplayNameMap = useMemo(
        () => new Map(AZURE_AD_ROLES.map((role) => [role.id, role.displayName])),
        []
    );

    const groupFamilyColorMap = useMemo(() => {
        const families = Array.from(new Set(rows.map((row) => getGroupFamilyName(row.groupName)))).sort((a, b) =>
            a.localeCompare(b, 'de', { sensitivity: 'base' })
        );
        const colorMap = new Map<string, { light: string; dark: string }>();
        families.forEach((family, index) => {
            colorMap.set(family, GROUP_FAMILY_PALETTE[index % GROUP_FAMILY_PALETTE.length]);
        });
        return colorMap;
    }, [rows]);

    const getRoleLabel = useCallback(
        (roleId: string) => roleDisplayNameMap.get(roleId) || roleId,
        [roleDisplayNameMap]
    );

    const filteredRows = useMemo(() => {
        const normalizedFilter = groupNameFilter.trim().toLocaleLowerCase('de');
        if (!normalizedFilter) return rows;

        return rows.filter((row) => row.groupName.toLocaleLowerCase('de').includes(normalizedFilter));
    }, [groupNameFilter, rows]);

    const roleHeaderHeightPx = useMemo(() => {
        const labels = columnRoleIds.map((roleId) => getRoleLabel(roleId));
        if (labels.length === 0) return 120;

        let longestWidthPx = 0;

        if (typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Matches Tailwind text-xs + font-semibold used in the header.
                ctx.font = '600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
                labels.forEach((label) => {
                    const w = ctx.measureText(label).width;
                    if (w > longestWidthPx) longestWidthPx = w;
                });
            }
        }

        if (longestWidthPx === 0) {
            const fallbackMaxChars = labels.reduce((max, label) => (label.length > max ? label.length : max), 0);
            longestWidthPx = fallbackMaxChars * 6.2;
        }

        // Fit to the longest role title so the full vertical text remains visible.
        return Math.max(120, Math.min(380, Math.ceil(longestWidthPx) + 14));
    }, [columnRoleIds, getRoleLabel]);

    const getAccessToken = useCallback(async () => {
        const response = await window.electronAPI.getToken();
        if (!response?.accessToken) throw new Error('Failed to get access token.');
        return response.accessToken;
    }, []);

    const handleExportCsv = useCallback(async () => {
        if (isExporting) return;

        setIsExporting(true);
        setExportError(null);

        try {
            if (filteredRows.length === 0) {
                throw new Error('No security groups match the current filter.');
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const defaultFileName = `security-group-matrix-${timestamp}.csv`;
            const selectedPath = await window.electronAPI.selectSecurityMatrixCsvExportPath(defaultFileName);
            if (selectedPath.canceled) return;

            const header = ['Security Group', ...columnRoleIds.map((roleId) => getRoleLabel(roleId))];
            const csvRows = filteredRows.map((row) => [
                row.groupName,
                ...columnRoleIds.map((roleId) => (row.roleIds.has(roleId) ? 'X' : '-')),
            ]);
            const csvContent = `\uFEFF${[header, ...csvRows]
                .map((values) => values.map(toCsvValue).join(';'))
                .join('\r\n')}`;

            const saveResult = await window.electronAPI.saveSecurityMatrixCsv(selectedPath.filePath, csvContent);
            if (!saveResult.success) {
                throw new Error(saveResult.error || 'Failed to save CSV file.');
            }
        } catch (err: any) {
            setExportError(err.message || 'Failed to export security matrix as CSV.');
        } finally {
            setIsExporting(false);
        }
    }, [columnRoleIds, filteredRows, getRoleLabel, isExporting]);

    const loadMatrix = useCallback(async (forceRefresh = false, isCancelled?: () => boolean) => {
        setIsLoading(true);
        setRows([]);
        setColumnRoleIds([]);
        setLoadedCount(0);
        setTotalCount(0);
        setLoadingLabel('Collecting active role assignments');
        setError(null);
        if (forceRefresh) {
            onRefreshStateChange?.({ isRefreshing: true, lastRefreshedAt: null });
        }

        const handleProgress = (progress: GDAPSnapshotProgress) => {
            if (isCancelled?.()) return;
            setLoadedCount(progress.current);
            setTotalCount(progress.total);
            setLoadingLabel(progress.message);
        };

        try {
            const token = await getAccessToken();
            const snapshot = await getGDAPRelationshipsSnapshot(token, {
                ...(forceRefresh ? { forceRefresh: true } : {}),
                onProgress: handleProgress,
            });
            const relationships = snapshot.relationships;
            if (isCancelled?.()) return;

            setTotalCount((prev) => (prev > 0 ? prev : relationships.length));

            const groupRoleMap = new Map<string, Set<string>>();
            const roleIdSet = new Set<string>();

            relationships.forEach((relationship) => {
                const assignments = snapshot.assignmentsByRelationshipId[relationship.id] || [];

                assignments
                    .filter((assignment) => assignment.status === 'active')
                    .forEach((assignment) => {
                        const groupName = assignment.accessContainer.displayName;
                        if (!groupName || groupName === 'Name not found') return;

                        if (!groupRoleMap.has(groupName)) {
                            groupRoleMap.set(groupName, new Set<string>());
                        }

                        const groupRoleIds = groupRoleMap.get(groupName)!;
                        assignment.accessDetails.unifiedRoles.forEach((role) => {
                            if (!role.roleDefinitionId) return;
                            groupRoleIds.add(role.roleDefinitionId);
                            roleIdSet.add(role.roleDefinitionId);
                        });
                    });
            });

            setLoadedCount(relationships.length);
            const sortedRows: MatrixRow[] = Array.from(groupRoleMap.entries())
                .map(([groupName, roleIds]) => ({ groupName, roleIds }))
                .sort((a, b) => a.groupName.localeCompare(b.groupName, 'de', { sensitivity: 'base' }));

            const sortedColumnRoleIds = Array.from(roleIdSet).sort((a, b) =>
                getRoleLabel(a).localeCompare(getRoleLabel(b), 'de', { sensitivity: 'base' })
            );
            if (isCancelled?.()) return;

            setRows(sortedRows);
            setColumnRoleIds(sortedColumnRoleIds);
            onRefreshStateChange?.({ isRefreshing: false, lastRefreshedAt: Date.now() });
        } catch (err: any) {
            if (isCancelled?.()) return;
            setError(err.message || 'Failed to load security matrix.');
            if (forceRefresh) {
                onRefreshStateChange?.({ isRefreshing: false, lastRefreshedAt: null });
            }
        } finally {
            if (isCancelled?.()) return;
            setIsLoading(false);
        }
    }, [getAccessToken, getRoleLabel, onRefreshStateChange]);

    useEffect(() => {
        let cancelled = false;
        void loadMatrix(false, () => cancelled);
        return () => {
            cancelled = true;
        };
    }, [loadMatrix]);

    useEffect(() => {
        if (refreshToken <= 0) return;
        let cancelled = false;
        void loadMatrix(true, () => cancelled);
        return () => {
            cancelled = true;
        };
    }, [loadMatrix, refreshToken]);

    if (isLoading) {
        return (
            <LoadingProgressCard
                title={`Loading matrix${totalCount > 0 ? ` - ${loadedCount} / ${totalCount} elements` : '...'}`}
                progressLabel={loadingLabel}
                current={loadedCount}
                total={totalCount}
            />
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-semibold">Failed to load matrix</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
        );
    }

    if (rows.length === 0 || columnRoleIds.length === 0) {
        return <div className="text-center py-10 text-gray-500">No active security group role assignments found.</div>;
    }

    return (
        <div className="bg-white shadow-lg rounded-lg p-4 md:p-6">
            <div className="flex justify-end mb-3">
                <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={isExporting}
                    className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isExporting ? 'Exporting CSV...' : 'Export CSV'}
                </button>
            </div>
            {exportError && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{exportError}</div>}

            <div className="bg-white">
                <div className="flex items-baseline gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Security Group Permission Matrix</h2>
                    <span className="text-sm text-gray-500">
                        {filteredRows.length}{groupNameFilter.trim() ? ` of ${rows.length}` : ''} security groups · {columnRoleIds.length} permission levels
                    </span>
                </div>

                <div className="flex items-center gap-5 mb-4 text-xs">
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block w-4 h-4 rounded bg-green-100 border border-green-200" />
                        <span className="text-gray-600">Role active for security group</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block w-4 h-4 rounded bg-rose-100 border border-rose-200" />
                        <span className="text-gray-600">Role not active</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block w-4 h-4 rounded bg-sky-100 border border-sky-200" />
                        <span className="text-gray-600">Security group family color</span>
                    </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="border-collapse text-xs min-w-full">
                    <thead className="sticky top-0 z-20">
                        <tr>
                            <th className="sticky left-0 z-30 bg-indigo-700 border border-indigo-600 px-4 py-3 text-left font-semibold text-white min-w-[280px]">
                                Security Group
                            </th>
                            {columnRoleIds.map((roleId) => (
                                <th
                                    key={roleId}
                                    className="border border-indigo-200 px-1 py-1 text-left font-semibold text-indigo-900 bg-indigo-50 align-bottom min-w-[42px]"
                                    title={getRoleLabel(roleId)}
                                >
                                    <div className="relative w-full" style={{ height: `${roleHeaderHeightPx}px` }}>
                                        <span className="absolute bottom-0 left-0 [writing-mode:vertical-rl] rotate-180 [text-orientation:mixed] whitespace-nowrap leading-tight text-left">
                                            {getRoleLabel(roleId)}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                        <tr>
                            <th className="sticky left-0 z-30 bg-white border border-gray-200 px-3 py-2 min-w-[280px]">
                                <input
                                    type="search"
                                    value={groupNameFilter}
                                    onChange={(event) => setGroupNameFilter(event.target.value)}
                                    placeholder="Contains, e.g. CG"
                                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 placeholder:text-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    aria-label="Filter security groups by name"
                                />
                            </th>
                            {columnRoleIds.map((roleId) => (
                                <th key={`filter-${roleId}`} className="border border-gray-200 bg-white px-1 py-2" aria-hidden="true" />
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={columnRoleIds.length + 1} className="border border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                                    No security groups match this filter.
                                </td>
                            </tr>
                        ) : filteredRows.map((row, rowIdx) => {
                            const family = getGroupFamilyName(row.groupName);
                            const familyColors = groupFamilyColorMap.get(family) || { light: '#F9FAFB', dark: '#F3F4F6' };
                            const familyBandColor = rowIdx % 2 === 0 ? familyColors.light : familyColors.dark;

                            return (
                            <tr key={row.groupName} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                                <td
                                    className="sticky left-0 z-10 border border-gray-200 px-4 py-1.5 font-medium text-gray-800 whitespace-nowrap"
                                    style={{ backgroundColor: familyBandColor }}
                                    title={`Family: ${family}`}
                                >
                                    {row.groupName}
                                </td>

                                {columnRoleIds.map((roleId) => {
                                    const isActive = row.roleIds.has(roleId);
                                    return (
                                        <td
                                            key={`${row.groupName}-${roleId}`}
                                            title={`${row.groupName} - ${getRoleLabel(roleId)}: ${isActive ? 'active' : 'not active'}`}
                                            className={`relative border border-gray-200 px-2 pr-4 py-1.5 text-center font-bold ${
                                                isActive ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
                                            }`}
                                        >
                                            {isActive ? 'X' : '-'}
                                            <span
                                                className="absolute right-0 top-0 bottom-0 w-1.5"
                                                style={{ backgroundColor: familyBandColor }}
                                                aria-hidden="true"
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
};

export default SecurityMatrixPage;
