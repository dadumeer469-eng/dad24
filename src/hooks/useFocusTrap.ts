import { useEffect, useRef } from "react";

/**
 * Shared focus-trap + ESC-to-close hook for every Dadu Food overlay
 * (modals, drawers, pickers). Added for the a11y fix program, 27 Nov 2026
 * (audit finding: modals trapped no focus and ignored ESC).
 *
 * Behaviour:
 * - When `isOpen` becomes true, focus moves to the first focusable element
 *   inside `containerRef` (or the container itself when it has tabIndex={-1}).
 * - Tab / Shift+Tab cycles inside the container — focus can never walk out
 *   into the page behind the overlay.
 * - Escape calls `onClose`.
 * - On close/unmount, focus returns to whatever had it before the overlay
 *   opened.
 * - A module-level stack keeps nested overlays correct (e.g. the vouchers
 *   modal opened from inside a cart drawer): only the topmost overlay
 *   handles keys, so ESC closes just that one.
 *
 * `onClose` is read through a ref so inline arrow props (new identity on
 * every parent render) never re-run the effect and yank focus back.
 */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Stack of currently-open overlay containers, innermost last.
const openOverlays: HTMLElement[] = [];

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getClientRects().length > 0,
  );
}

export function useFocusTrap(
  containerRef: { current: HTMLElement | null },
  isOpen: boolean,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus inside the overlay (first focusable wins; the container
    // itself is the fallback when it carries tabIndex={-1}).
    const initial = getFocusable(container);
    (initial[0] ?? container).focus();

    openOverlays.push(container);

    const onKeyDown = (e: KeyboardEvent) => {
      // Only the topmost overlay owns the keyboard. This is what keeps
      // ESC/Tab in a nested modal (e.g. vouchers inside a cart drawer)
      // from also closing/trapping the overlay underneath it.
      if (openOverlays[openOverlays.length - 1] !== container) return;
      const target = e.target as Node | null;
      const focusInside = !!target && container.contains(target);
      const focusNowhere = document.activeElement === document.body;
      // If focus somehow sits in a different overlay, stay out of it.
      if (!focusInside && !focusNowhere) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const items = getFocusable(container);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const idx = openOverlays.indexOf(container);
      if (idx !== -1) openOverlays.splice(idx, 1);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
    // containerRef is a stable ref object; onClose is read via onCloseRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
