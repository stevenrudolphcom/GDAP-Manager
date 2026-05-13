import React, { useState, useMemo } from 'react';
import { DelegatedAdminRelationship } from '../types';
import SearchIcon from './icons/SearchIcon';

interface RelationshipListProps {
    relationships: DelegatedAdminRelationship[];
    selectedRelationshipId: string | null;
    onSelectRelationship: (relationship: DelegatedAdminRelationship) => void;
    onRefresh: () => void;
    assignmentCounts?: Record<string, number>;
    isPreloading?: boolean;
    preloadDone?: number;
    preloadTotal?: number;
}

const RelationshipList: React.FC<RelationshipListProps> = ({ relationships, selectedRelationshipId, onSelectRelationship, onRefresh, assignmentCounts, isPreloading, preloadDone = 0, preloadTotal = 0 }) => {
    const [filter, setFilter] = useState('');

    const filteredRelationships = useMemo(() => {
        const filtered = !filter
            ? relationships
            : relationships.filter(
                (r) =>
                    r.displayName.toLowerCase().includes(filter.toLowerCase()) ||
                    r.customer.tenantId.toLowerCase().includes(filter.toLowerCase())
            );
        const isTerminated = (s: string) => s === 'terminated' || s === 'terminating' ? 1 : 0;
        return [...filtered].sort((a, b) => {
            const termDiff = isTerminated(a.status) - isTerminated(b.status);
            if (termDiff !== 0) return termDiff;
            return a.displayName.localeCompare(b.displayName);
        });
    }, [relationships, filter]);

    const getStatusColor = (status: DelegatedAdminRelationship['status']) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'approvalPending': return 'bg-yellow-100 text-yellow-800';
            case 'approved': return 'bg-blue-100 text-blue-800';
            case 'terminated':
            case 'expired':
                return 'bg-gray-100 text-gray-800';
            default: return 'bg-purple-100 text-purple-800';
        }
    };
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
                 <h2 className="text-lg font-semibold text-gray-800">Relationships</h2>
                 <button onClick={onRefresh} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Refresh</button>
            </div>
            {isPreloading ? (
                <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Loading assignment counts…</span>
                        <span>{preloadDone} / {preloadTotal}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: preloadTotal > 0 ? `${(preloadDone / preloadTotal) * 100}%` : '0%' }}
                        />
                    </div>
                </div>
            ) : preloadTotal > 0 ? (
                <div className="mb-3 h-4" />
            ) : null}
            <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Filter by name or tenant ID..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>
            <div className="flex-grow overflow-y-auto -mr-4 pr-2">
                {filteredRelationships.length > 0 ? (
                    <ul className="space-y-2">
                        {filteredRelationships.map((r) => (
                            <li key={r.id}>
                                <button
                                    onClick={() => onSelectRelationship(r)}
                                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedRelationshipId === r.id ? 'bg-indigo-100 shadow' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-gray-900 truncate">
                                            {r.displayName}
                                            {assignmentCounts?.[r.id] !== undefined && (
                                                <span className="ml-1.5 text-xs font-normal text-gray-500">({assignmentCounts[r.id]})</span>
                                            )}
                                        </p>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(r.status)}`}>
                                            {r.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{r.customer.tenantId}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-500">No relationships found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RelationshipList;
