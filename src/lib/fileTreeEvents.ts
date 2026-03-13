/**
 * Minimal event bus for file-tree mutations.
 *
 * Any component that creates, renames, or deletes a profile calls `emit()`.
 * FileEditor subscribes with `subscribe()` and calls `loadFileTree()`.
 *
 * Using a DOM CustomEvent keeps components fully decoupled — no prop
 * drilling, no extra context, no third-party state library needed.
 */

const EVENT = 'cvenom:filetree-changed';

const isBrowser = typeof window !== 'undefined';

export const fileTreeEvents = {
  /** Fire the event — safe to call during SSR (no-op). */
  emit: (): void => {
    if (isBrowser) window.dispatchEvent(new CustomEvent(EVENT));
  },

  /**
   * Subscribe to file-tree-changed events.
   * Returns an unsubscribe function suitable for `useEffect` cleanup.
   */
  subscribe: (fn: () => void): (() => void) => {
    if (!isBrowser) return () => {};
    window.addEventListener(EVENT, fn);
    return () => window.removeEventListener(EVENT, fn);
  },
};
