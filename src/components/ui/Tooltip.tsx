'use client';

import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const GAP = 6; // px between trigger and tooltip

const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top', delay = 400 }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const show = () => {
    timer.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
    setCoords(null);
  };

  const reposition = useCallback(() => {
    if (!wrapperRef.current || !tooltipRef.current) return;
    const trigger = wrapperRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;
    switch (side) {
      case 'top':
        top = trigger.top - tip.height - GAP;
        left = trigger.left + trigger.width / 2 - tip.width / 2;
        break;
      case 'bottom':
        top = trigger.bottom + GAP;
        left = trigger.left + trigger.width / 2 - tip.width / 2;
        break;
      case 'left':
        top = trigger.top + trigger.height / 2 - tip.height / 2;
        left = trigger.left - tip.width - GAP;
        break;
      case 'right':
        top = trigger.top + trigger.height / 2 - tip.height / 2;
        left = trigger.right + GAP;
        break;
    }
    // Clamp to viewport so it stays visible
    const margin = 4;
    left = Math.max(margin, Math.min(left, window.innerWidth - tip.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - tip.height - margin));
    setCoords({ top, left });
  }, [side]);

  useLayoutEffect(() => {
    if (!visible) return;
    reposition();
    const onScrollOrResize = () => reposition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [visible, reposition]);

  const popup =
    visible && typeof document !== 'undefined'
      ? createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              visibility: coords ? 'visible' : 'hidden',
            }}
            className="pointer-events-none z-[9999] whitespace-nowrap rounded-md bg-foreground/90 px-2 py-1 text-xs text-background shadow-md"
          >
            {content}
          </span>,
          document.body,
        )
      : null;

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {popup}
    </span>
  );
};

export default Tooltip;
