import React from 'react';
import tmLogoImg from '../assets/tm_logo.png';

interface TMLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const TMLogo: React.FC<TMLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className={`relative flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 border border-cyan-500/30 bg-slate-950 group ${sizeClasses[size]} ${className}`}>
      <img
        src={tmLogoImg}
        alt="TechMart TM Logo"
        className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
};

export default TMLogo;
