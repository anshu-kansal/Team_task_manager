import React from 'react';

export default function Skeleton({ variant = 'card', className = '' }) {
  const cls = variant === 'stat' ? 'skeleton skeleton-stat' : variant === 'row' ? 'skeleton skeleton-row' : 'skeleton skeleton-card';
  return <div className={`${cls} ${className}`.trim()} />;
}
