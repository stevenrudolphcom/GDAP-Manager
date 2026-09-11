import React, { useCallback, useMemo, useState } from 'react';
import GDAPRequestForm from '@/components/GDAPRequestForm';
import AuthLayout from '@/components/AuthLayout';
import ManageAssignments from '@/components/ManageAssignments';
import OverviewPage from '@/components/OverviewPage';
import SecurityMatrixPage from '@/components/SecurityMatrixPage';
import PageRefreshButton from '@/components/PageRefreshButton';

type View = 'create' | 'manage' | 'overview' | 'matrix';

type RefreshableView = Exclude<View, 'create'>;

interface RefreshState {
    isRefreshing: boolean;
    lastRefreshedAt: number | null;
}

const DEFAULT_REFRESH_STATE: Record<RefreshableView, RefreshState> = {
    manage: { isRefreshing: false, lastRefreshedAt: null },
    overview: { isRefreshing: false, lastRefreshedAt: null },
    matrix: { isRefreshing: false, lastRefreshedAt: null },
};

const isRefreshableView = (view: View): view is RefreshableView => view !== 'create';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<View>('create');
    const [visitedViews, setVisitedViews] = useState<Record<View, boolean>>({
        create: true,
        manage: false,
        overview: false,
        matrix: false,
    });
    const [refreshTokens, setRefreshTokens] = useState<Record<RefreshableView, number>>({
        manage: 0,
        overview: 0,
        matrix: 0,
    });
    const [refreshStateByView, setRefreshStateByView] = useState<Record<RefreshableView, RefreshState>>(DEFAULT_REFRESH_STATE);

    const handleRefreshStateChange = useCallback((view: RefreshableView, nextState: RefreshState) => {
        setRefreshStateByView((prev) => ({
            ...prev,
            [view]: nextState,
        }));
    }, []);

    const handleManageRefreshStateChange = useCallback(
        (state: RefreshState) => handleRefreshStateChange('manage', state),
        [handleRefreshStateChange]
    );

    const handleOverviewRefreshStateChange = useCallback(
        (state: RefreshState) => handleRefreshStateChange('overview', state),
        [handleRefreshStateChange]
    );

    const handleMatrixRefreshStateChange = useCallback(
        (state: RefreshState) => handleRefreshStateChange('matrix', state),
        [handleRefreshStateChange]
    );

    const handleHeaderRefresh = () => {
        if (!isRefreshableView(activeView)) return;
        setRefreshTokens((prev) => ({
            ...prev,
            [activeView]: prev[activeView] + 1,
        }));
    };

    const handleViewChange = (view: View) => {
        setActiveView(view);
        setVisitedViews((prev) => (
            prev[view]
                ? prev
                : {
                    ...prev,
                    [view]: true,
                }
        ));
    };

    const formatLastRefreshed = (timestamp: number | null) => {
        if (!timestamp) return 'Noch nicht aktualisiert';
        return new Intl.DateTimeFormat('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(new Date(timestamp));
    };

    const activeRefreshState = isRefreshableView(activeView)
        ? refreshStateByView[activeView]
        : null;

    const canRefresh = isRefreshableView(activeView);

    const getHeader = () => {
        switch (activeView) {
            case 'manage':
                return {
                    title: 'Manage GDAP Assignments',
                    subtitle: 'View existing relationships and assign security groups to roles.'
                };
            case 'overview':
                return {
                    title: 'Assignment Overview',
                    subtitle: 'Matrix view of all relationships and their assigned security groups.'
                };
            case 'matrix':
                return {
                    title: 'Security Group Matrix',
                    subtitle: 'All security groups and their active permission levels across GDAP assignments.'
                };
            case 'create':
            default:
                return {
                    title: 'GDAP Request Creator',
                    subtitle: 'Create a new Granular Delegated Admin Privileges request for a customer.'
                };
        }
    };
    
    const headerContent = getHeader();
    const refreshMeta = useMemo(() => {
        if (!activeRefreshState) return null;
        return formatLastRefreshed(activeRefreshState.lastRefreshedAt);
    }, [activeRefreshState]);

    const topRightRefreshContent = canRefresh && activeRefreshState ? (
        <div className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2 shadow-sm">
            <div className="flex items-center gap-3">
                <PageRefreshButton
                    onClick={handleHeaderRefresh}
                    isRefreshing={activeRefreshState.isRefreshing}
                    label="Refresh"
                    className="px-2.5 py-1.5 text-xs rounded-lg"
                />
                <div className="text-left leading-tight">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Refresh Date</p>
                    <p className="text-xs text-gray-700">{refreshMeta}</p>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <AuthLayout topRightContent={topRightRefreshContent}>
            <div className="w-[95%]">
                <header className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{headerContent.title}</h1>
                    <p className="text-md text-gray-600 mt-2">{headerContent.subtitle}</p>
                </header>
                
                <nav className="mb-8 flex justify-center border-b border-gray-200">
                    <button
                        onClick={() => handleViewChange('create')}
                        className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 ${activeView === 'create' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Create Request
                    </button>
                    <button
                        onClick={() => handleViewChange('manage')}
                        className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 ${activeView === 'manage' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Manage Assignments
                    </button>
                    <button
                        onClick={() => handleViewChange('overview')}
                        className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 ${activeView === 'overview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => handleViewChange('matrix')}
                        className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 ${activeView === 'matrix' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Security Matrix
                    </button>
                </nav>

                <main>
                    <div className={activeView === 'create' ? 'block' : 'hidden'}>
                        <GDAPRequestForm />
                    </div>
                    {visitedViews.manage && (
                        <div className={activeView === 'manage' ? 'block' : 'hidden'}>
                            <ManageAssignments
                                refreshToken={refreshTokens.manage}
                                onRefreshStateChange={handleManageRefreshStateChange}
                            />
                        </div>
                    )}
                    {visitedViews.overview && (
                        <div className={activeView === 'overview' ? 'block' : 'hidden'}>
                            <OverviewPage
                                refreshToken={refreshTokens.overview}
                                onRefreshStateChange={handleOverviewRefreshStateChange}
                            />
                        </div>
                    )}
                    {visitedViews.matrix && (
                        <div className={activeView === 'matrix' ? 'block' : 'hidden'}>
                            <SecurityMatrixPage
                                refreshToken={refreshTokens.matrix}
                                onRefreshStateChange={handleMatrixRefreshStateChange}
                            />
                        </div>
                    )}
                </main>
                 <footer className="text-center mt-8 text-sm text-gray-500">
                    <p>Powered by Microsoft Graph API</p>
                </footer>
            </div>
        </AuthLayout>
    );
};

export default App;