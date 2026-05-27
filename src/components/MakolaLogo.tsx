import React from 'react';

interface MakolaLogoProps {
  className?: string;
  size?: number;
}

export default function MakolaLogo({ className = "w-12 h-12", size = 100 }: MakolaLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Circle Ring in Deep Teal with a top-left gap */}
      <path 
        d="M 28 15 A 42 42 0 1 1 12 40" 
        stroke="#1A5B70" 
        strokeWidth="6" 
        strokeLinecap="round" 
      />
      
      {/* Arrow pointing upper-left at the top-left of the circle */}
      <path 
        d="M 28 15 L 12 15 L 12 31" 
        stroke="#1A5B70" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M 12 15 L 23 26" 
        stroke="#1A5B70" 
        strokeWidth="6" 
        strokeLinecap="round"
      />
      
      {/* The Central Orange "M" Cart Shape */}
      <path 
        d="M 33 34 L 43 57 L 55 42 L 67 57 L 77 34" 
        stroke="#F05A28" 
        strokeWidth="9" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Lower Teal Chassis Bar */}
      <path 
        d="M 44 68 L 68 68" 
        stroke="#1A5B70" 
        strokeWidth="5" 
        strokeLinecap="round" 
      />
      
      {/* Two Teal Wheels */}
      <circle cx="45" cy="78" r="5" fill="#1A5B70" />
      <circle cx="67" cy="78" r="5" fill="#1A5B70" />
    </svg>
  );
}
