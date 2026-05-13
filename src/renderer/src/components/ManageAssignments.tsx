import React, { useState, useEffect, useCallback } from 'react';
import { DelegatedAdminRelationship } from '../types';
import { getGDAPRelationships, getGDAPRelationshipAccessAssignments } from '../services/graphService';
import RelationshipList from './RelationshipList';
import AssignmentEditor from './AssignmentEditor';
import SpinnerIcon from './icons/SpinnerIcon';

const ManageAssignments: React.FC = () => {
    const [relationships, setRelationships] = useState<DelegatedAdminRelationship[]>([]);
    const [selectedRelationship, setSelectedRelationship] = useState<DelegatedAdminRelationship | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
    const [isPreloading, setIsPreloading] = useState(false);
    const [preloadDone, setPreloadDone] = useState(0);
    const [preloadTotal, setPreloadTotal] = useState(0);

    const getAccessToken = useCallback(async () => {
        const response = await window.electronAPI.getToken();
        if (!response?.accessToken) {
            throw new Error('Failed to get access token.');
        }
        return response.accessToken;
    }, []);

    const preloadAssignmentCounts = useCallback(async (rels: DelegatedAdminRelationship[]) => {
        if (rels.length === 0) return;
        setIsPreloading(true);
        setPreloadDone(0);
        setPreloadTotal(rels.length);
        setAssignmentCounts({});
        const token = await getAccessToken();
        rels.forEach(r => {
            getGDAPRelationshipAccessAssignments(r.id, token)
                .then(assignments => {
                    setAssignmentCounts(prev => ({ ...prev, [r.id]: assignments.length }));
                })
                .catch(() => { /* Fehler beim Preload ignorieren */ })
                .finally(() => {
                    setPreloadDone(prev => {
                        const next = prev + 1;
                        if (next >= rels.length) setIsPreloading(false);
                        return next;
                    });
                });
        });
    }, [getAccessToken]);

    const fetchRelationships = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getAccessToken();
            const data = await getGDAPRelationships(token);
            setRelationships(data);
            
            // If we have a selected relationship, try to find its updated version in the new data
            if (selectedRelationship) {
                const updated = data.find(r => r.id === selectedRelationship.id);
                if (updated) setSelectedRelationship(updated);
            }

            preloadAssignmentCounts(data);
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching relationships.');
        } finally {
            setIsLoading(false);
        }
    }, [getAccessToken, selectedRelationship, preloadAssignmentCounts]);

    useEffect(() => {
        fetchRelationships();
    }, []); // Only fetch once on mount

    const handleRefresh = () => {
        setSelectedRelationship(null);
        fetchRelationships();
    };

    const handleUpdateRelationship = (updated: DelegatedAdminRelationship) => {
        setRelationships(prev => prev.map(r => r.id === updated.id ? updated : r));
        setSelectedRelationship(updated);
    };

    const handleAssignmentsLoaded = useCallback((relationshipId: string, count: number) => {
        setAssignmentCounts(prev => ({ ...prev, [relationshipId]: count }));
    }, []);

    if (isLoading && relationships.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white shadow-lg rounded-lg min-h-[400px]">
                <SpinnerIcon className="h-12 w-12 animate-spin text-indigo-600" />
                <span className="mt-4 text-gray-600 font-bold uppercase tracking-widest text-sm">Loading relationships...</span>
            </div>
        );
    }
    
    if (error && relationships.length === 0) {
        return (
            <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-semibold">Failed to load data</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button 
                    onClick={fetchRelationships} 
                    className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="flex gap-6 bg-white shadow-lg rounded-lg p-4 md:p-6 min-h-[600px]">
            <div className="flex-none border-r border-gray-100 pr-4" style={{ minWidth: '400px' }}>
                <RelationshipList 
                    relationships={relationships}
                    selectedRelationshipId={selectedRelationship?.id || null}
                    onSelectRelationship={setSelectedRelationship}
                    onRefresh={handleRefresh}
                    assignmentCounts={assignmentCounts}
                    isPreloading={isPreloading}
                    preloadDone={preloadDone}
                    preloadTotal={preloadTotal}
                />
            </div>
            <div className="flex-1 min-w-0">
                <AssignmentEditor 
                    key={selectedRelationship?.id} 
                    relationship={selectedRelationship} 
                    getAccessToken={getAccessToken}
                    onUpdateRelationship={handleUpdateRelationship}
                    onAssignmentsLoaded={handleAssignmentsLoaded}
                />
            </div>
        </div>
    );
};

export default ManageAssignments;
