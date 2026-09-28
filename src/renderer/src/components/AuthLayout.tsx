import React, { useState, useEffect } from 'react';
import { APP_CONFIG } from '../../../appConfig';

const SignInButton: React.FC = () => {
    const handleLogin = () => {
        window.electronAPI.login().catch((e: Error) => console.error(e));
    };
    return (
        <button
            onClick={handleLogin}
            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
        >
            Sign In with Microsoft
        </button>
    );
};

const SignOutButton: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => {
    const handleLogout = () => {
        window.electronAPI.logout().then(onSignOut).catch((e: Error) => console.error(e));
    };
    return (
        <button
            onClick={handleLogout}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
            Sign Out
        </button>
    );
};

const AuthLayout: React.FC<{ children: React.ReactNode; topRightContent?: React.ReactNode }> = ({ children, topRightContent }) => {
    const [account, setAccount] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        // On component mount, check if there's an active account
        const checkAccount = async () => {
            try {
                const currentAccount = await window.electronAPI.getAccount();
                setAccount(currentAccount);
            } catch (error) {
                console.error("Error getting account:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkAccount();

        // Re-check when login or logout happens (e.g., window focus)
        // This is a simple way to sync state after the MSAL interactive flow
        const handleFocus = () => checkAccount();
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    const handleSignOut = () => {
        setAccount(null);
    };

    if (isLoading) {
        return (
             <div className="min-h-screen flex items-center justify-center">
                Loading...
            </div>
        )
    }

    const isAuthenticated = !!account;
    const name = account?.name; // Now correctly uses the `name` property

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col items-center p-4 sm:p-6">
            <div className="w-[95%] flex flex-col flex-grow">
                <header className="w-full flex justify-between items-start gap-4 pb-4">
                    <div className="rounded-md border border-gray-200 bg-white/90 px-3 py-2 text-xs text-gray-700 shadow-sm space-y-1">
                        <div className="font-semibold">
                            Root-Version: {APP_CONFIG.ROOT_VERSION} <span className="font-normal text-gray-600">(Autor: {APP_CONFIG.ROOT_AUTHOR})</span>
                        </div>
                        <div className="font-semibold">
                            Sub-Version: {APP_CONFIG.SUB_VERSION} <span className="font-normal text-gray-600">(Contributor: {APP_CONFIG.SUB_CONTRIBUTOR})</span>
                        </div>
                    </div>

                    {isAuthenticated && (
                        <div className="flex items-start gap-4">
                            {topRightContent && (
                                <div className="flex-shrink-0">{topRightContent}</div>
                            )}
                            <div className="text-right">
                                <p className="text-sm font-semibold text-gray-800">{name}</p>
                                <SignOutButton onSignOut={handleSignOut} />
                            </div>
                        </div>
                    )}
                </header>

                {isAuthenticated ? (
                    <div className="w-full flex-grow flex flex-col">
                        {children}
                    </div>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to GDAP Creator</h1>
                        <p className="text-gray-600 mb-8">Please sign in to continue.</p>
                        <SignInButton />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthLayout;
