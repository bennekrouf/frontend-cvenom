'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FiUpload,
  FiEdit3,
  FiTarget,
  FiFileText,
  FiMessageSquare,
  FiCode,
  FiList,
  FiX,
  FiArrowRight,
  FiImage,
} from 'react-icons/fi';

// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cvenom-tour-dismissed';
const TOUR_VERSION = 1; // bump to re-show tour after major feature additions

function isTourDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (!val) return false;
    const parsed = JSON.parse(val);
    return parsed.version >= TOUR_VERSION;
  } catch {
    return false;
  }
}

function dismissTour() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: TOUR_VERSION, at: Date.now() }));
}

// ── Tour steps ───────────────────────────────────────────────────────────────

interface TourStep {
  /** CSS selector to highlight — null for a centred "welcome" card */
  target: string | null;
  icon: React.ReactNode;
  title: string;
  body: string;
  /** Where the tooltip goes relative to the target */
  placement: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

const STEPS: TourStep[] = [
  {
    target: null,
    icon: <FiEdit3 className="w-6 h-6 text-primary" />,
    title: 'Welcome to cVenom Studio',
    body: 'Your AI-powered CV workspace. Let us show you around — it only takes a minute.',
    placement: 'center',
  },
  {
    target: '[data-tour="upload-cv"]',
    icon: <FiUpload className="w-5 h-5 text-blue-500" />,
    title: 'Upload your CV',
    body: 'Drop a PDF or Word document here. We\'ll extract your experience, skills, and education automatically into an editable profile.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="sidebar"]',
    icon: <FiList className="w-5 h-5 text-blue-500" />,
    title: 'Your profiles',
    body: 'All your CV profiles appear here. Click one to select it, then edit in Form view or raw Code view. You can have multiple profiles for different job targets.',
    placement: 'right',
  },
  {
    target: '[data-tour="view-toggle"]',
    icon: <FiCode className="w-5 h-5 text-indigo-500" />,
    title: 'Form & Code views',
    body: 'Switch between a visual form editor and the raw Typst code that powers your CV.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="optimize"]',
    icon: <FiTarget className="w-5 h-5 text-orange-500" />,
    title: 'Optimize for a job',
    body: 'Paste any job posting and our AI will tailor your CV — matching keywords, reordering skills, and boosting your ATS score.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="cover-letter"]',
    icon: <FiFileText className="w-5 h-5 text-purple-500" />,
    title: 'Cover letter',
    body: 'Generate a personalised cover letter based on your profile and a job description. Download as PDF instantly.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="generate-cv"]',
    icon: <FiFileText className="w-5 h-5 text-green-500" />,
    title: 'Generate PDF',
    body: 'Export a beautifully formatted CV as PDF. Choose your language and template. This is the final step after uploading or editing!',
    placement: 'bottom',
  },
  {
    target: '[data-tour="portfolio"]',
    icon: <FiImage className="w-5 h-5 text-violet-500" />,
    title: 'Portfolio',
    body: 'Create a visual portfolio PDF showcasing your projects and achievements alongside your CV.',
    placement: 'bottom',
  },
  // Chat tab step removed while the AI chat assistant is hidden from the UI.
  // Re-add this step once the chat tab is restored in FileEditor.
  {
    target: null,
    icon: <FiArrowRight className="w-6 h-6 text-green-500" />,
    title: 'You\'re all set!',
    body: 'Start by uploading your CV — we\'ll create your profile automatically. Then hit Generate to download your first PDF!',
    placement: 'center',
  },
];

// ── Tooltip positioning ──────────────────────────────────────────────────────

function getTooltipStyle(
  rect: DOMRect | null,
  placement: TourStep['placement'],
): React.CSSProperties {
  if (!rect || placement === 'center') {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const GAP = 12;
  const base: React.CSSProperties = { position: 'fixed' };

  switch (placement) {
    case 'bottom':
      base.top = rect.bottom + GAP;
      base.left = rect.left + rect.width / 2;
      base.transform = 'translateX(-50%)';
      break;
    case 'top':
      base.bottom = window.innerHeight - rect.top + GAP;
      base.left = rect.left + rect.width / 2;
      base.transform = 'translateX(-50%)';
      break;
    case 'right':
      base.top = rect.top + rect.height / 2;
      base.left = rect.right + GAP;
      base.transform = 'translateY(-50%)';
      break;
    case 'left':
      base.top = rect.top + rect.height / 2;
      base.right = window.innerWidth - rect.left + GAP;
      base.transform = 'translateY(-50%)';
      break;
  }

  return base;
}

// ── Spotlight cutout ─────────────────────────────────────────────────────────

function SpotlightOverlay({ rect }: { rect: DOMRect | null }) {
  if (!rect) {
    // Full dark overlay for centred steps
    return <div className="fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300" />;
  }

  const PAD = 8;
  const RADIUS = 12;
  const x = rect.left - PAD;
  const y = rect.top - PAD;
  const w = rect.width + PAD * 2;
  const h = rect.height + PAD * 2;

  return (
    <svg className="fixed inset-0 w-full h-full z-[9998] pointer-events-none" style={{ pointerEvents: 'auto' }}>
      <defs>
        <mask id="tour-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={RADIUS} ry={RADIUS} fill="black" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tour-mask)" />
    </svg>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface OnboardingTourProps {
  /** Whether the editor has at least one profile (some steps only make sense then) */
  hasProfiles: boolean;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ hasProfiles }) => {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  // Show tour on mount if not dismissed
  useEffect(() => {
    if (!isTourDismissed()) {
      // Small delay so the editor DOM is rendered
      const t = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  // Track the highlighted element's position
  const updateRect = useCallback(() => {
    const sel = STEPS[step]?.target;
    if (!sel) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(sel);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
    rafRef.current = requestAnimationFrame(updateRect);
  }, [step]);

  useEffect(() => {
    if (!active) return;
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, updateRect]);

  const handleDismiss = useCallback(() => {
    dismissTour();
    setActive(false);
  }, []);

  const handleNext = useCallback(() => {
    if (step >= STEPS.length - 1) {
      handleDismiss();
    } else {
      setStep(s => s + 1);
    }
  }, [step, handleDismiss]);

  const handlePrev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  // Keyboard: Escape to dismiss, Arrow Right / Enter to next
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, handleDismiss, handleNext, handlePrev]);

  if (!active) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const tooltipStyle = getTooltipStyle(targetRect, current.placement);

  return createPortal(
    <>
      {/* Spotlight overlay with cutout */}
      <SpotlightOverlay rect={targetRect} />

      {/* Tooltip card */}
      <div
        className="z-[9999] w-[340px] max-w-[90vw] animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={tooltipStyle}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-5">
            {/* Icon + title */}
            <div className="flex items-start gap-3 mb-2">
              <div className="p-2 bg-muted rounded-lg shrink-0">
                {current.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{current.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step + 1} of {STEPS.length}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                aria-label="Dismiss tour"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {current.body}
            </p>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <button
                onClick={handleDismiss}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={handlePrev}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  {isLast ? 'Get started' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default OnboardingTour;
