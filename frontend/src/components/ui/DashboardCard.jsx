import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from './Card';

function CountUp({ value = 0, duration = 600, className }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Number(value) || 0;
    if (end === 0) {
      setDisplay(0);
      return;
    }
    const stepTime = Math.max(16, Math.floor(duration / end));
    const timer = setInterval(() => {
      start += Math.max(1, Math.ceil(end / (duration / 16)));
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span className={cn("font-bold text-2xl tracking-tight text-gray-900 dark:text-white animate-count-up", className)}>
      {display}
    </span>
  );
}

export function DashboardCard({
  title,
  value = 0,
  icon: Icon,
  borderColor = 'border-l-primary-500',
  iconBgColor = 'bg-primary-50 dark:bg-primary-950/40',
  iconTextColor = 'text-primary-600 dark:text-primary-400',
  titleColor = 'text-surface-500 dark:text-surface-400',
  valueColor = 'text-gray-900 dark:text-white',
  className,
  duration = 600,
}) {
  return (
    <Card
      className={cn(
        "transition-all duration-300 border-l-4 group hover:shadow-card-hover hover:-translate-y-1 hover:border-l-primary-600 dark:hover:border-l-primary-400",
        borderColor,
        className
      )}
    >
      <CardContent className="p-4 flex items-center gap-3">
        {Icon && (
          <div
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 shrink-0",
              iconBgColor,
              iconTextColor
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("text-2xs font-semibold uppercase tracking-wider truncate", titleColor)}>
            {title}
          </p>
          <div className="flex items-baseline mt-0.5">
            <CountUp value={value} duration={duration} className={valueColor} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
