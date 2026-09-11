import React from 'react';

interface PageRefreshButtonProps {
    onClick: () => void;
    disabled?: boolean;
    isRefreshing?: boolean;
    label?: string;
    className?: string;
}

const PageRefreshButton: React.FC<PageRefreshButtonProps> = ({
    onClick,
    disabled = false,
    isRefreshing = false,
    label = 'Refresh',
    className = '',
}) => {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || isRefreshing}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h5M20 20v-5h-5M4 4a14.95 14.95 0 0113.433 4.805M20 20a14.95 14.95 0 01-13.433-4.805" />
            </svg>
            <span>{isRefreshing ? 'Refreshing...' : label}</span>
        </button>
    );
};

export default PageRefreshButton;