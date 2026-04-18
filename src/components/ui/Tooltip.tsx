'use client';

import React, { useState, useRef } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top', delay = 400 }) => {
  const [visible, setVisible] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const show = () => {
    timer.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  };

  const positionClass = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full  left-1/2 -translate-x-1/2 mt-1.5',
    left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right:  'left-full  top-1/2 -translate-y-1/2 ml-1.5',
  }[side];

  const arrowClass = {
    top:    'top-full  left-1/2 -translate-x-1/2 border-t-foreground/90 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-foreground/90 border-l-transparent border-r-transparent border-t-transparent',
    left:   'left-full  top-1/2 -translate-y-1/2 border-l-foreground/90 border-t-transparent border-b-transparent border-r-transparent',
    right:  'right-full top-1/2 -translate-y-1/2 border-r-foreground/90 border-t-transparent border-b-transparent border-l-transparent',
  }[side];

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground/90 px-2 py-1 text-xs text-background shadow-md ${positionClass}`}
        >
          {content}
          <span className={`absolute border-4 ${arrowClass}`} />
        </span>
      )}
    </span>
  );
};

export default Tooltip;
