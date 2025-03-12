import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', withText = true }) => {
  // Size classes mapping
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  // Text size classes mapping
  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className="flex items-center">
      {/* Logo Icon */}
      <div className={`${sizeClasses[size]} rounded-full bg-[#008DC1] flex items-center justify-center text-white font-bold`}>
        <span>m</span>
      </div>
      
      {/* Logo Text */}
      {withText && (
        <span className={`ml-2 font-bold ${textSizeClasses[size]} text-[#008DC1]`}>
          moxiphy
        </span>
      )}
    </div>
  );
};

export default Logo;
