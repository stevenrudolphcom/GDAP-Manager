import React from 'react';
import SpinnerIcon from './icons/SpinnerIcon';

interface LoadingProgressCardProps {
    title: string;
    progressLabel?: string;
    current?: number;
    total?: number;
    spinnerSizeClassName?: string;
}

const LoadingProgressCard: React.FC<LoadingProgressCardProps> = ({
    title,
    progressLabel,
    current = 0,
    total = 0,
    spinnerSizeClassName = 'h-10 w-10',
}) => {
    const hasProgress = total > 0;
    const percent = hasProgress ? (current / total) * 100 : 0;

    return (
        <div className="flex flex-col items-center justify-center p-12 bg-white shadow-lg rounded-lg min-h-[400px] gap-5">
            <SpinnerIcon className={`${spinnerSizeClassName} animate-spin text-indigo-600`} />
            <span className="text-gray-600 font-bold uppercase tracking-widest text-sm">{title}</span>
            {hasProgress && (
                <div className="w-80">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>{progressLabel}</span>
                        <span>{Math.round(percent)} %</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoadingProgressCard;