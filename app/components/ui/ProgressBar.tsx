import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  color = '#4f46e5', // Indigo-600
  backgroundColor = '#e5e7eb', // Gray-200
  showPercentage = false,
  className = '',
}) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className={`w-full ${className}`}>
      <div 
        className="w-full rounded-full overflow-hidden"
        style={{ height: `${height}px`, backgroundColor }}
      >
        <div
          className="h-full transition-all duration-300 ease-in-out"
          style={{ 
            width: `${clampedProgress}%`, 
            backgroundColor: color 
          }}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-right">
          {Math.round(clampedProgress)}%
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
