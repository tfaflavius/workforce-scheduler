/**
 * Centralized animation timing tokens.
 *
 * Use these instead of hard-coded ms values so every transition in the app
 * feels consistent and can be tuned from a single place.
 */

// ─── Durations (ms) ────────────────────────────────────────────────
/** Micro-interactions: checkbox tick, icon swap, ripple */
export const DURATION_INSTANT = 150;

/** Default UI transitions: hover, focus, color change */
export const DURATION_FAST = 200;

/** Standard transitions: dialogs, cards, dropdowns */
export const DURATION_NORMAL = 300;

/** Emphasis transitions: page fade-in, large modals */
export const DURATION_SLOW = 500;

/** Staggered list item animation base delay */
export const STAGGER_DELAY = 50;

// ─── Easing curves ─────────────────────────────────────────────────
/** Standard ease – good default for most transitions */
export const EASING_STANDARD = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** Decelerate – elements entering the screen */
export const EASING_ENTER = 'cubic-bezier(0.0, 0, 0.2, 1)';

/** Accelerate – elements leaving the screen */
export const EASING_EXIT = 'cubic-bezier(0.4, 0, 1, 1)';

/** Bounce – playful micro-interactions */
export const EASING_BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

// ─── Shorthand helpers ─────────────────────────────────────────────
/** Quick CSS transition string: `all 200ms cubic-bezier(...)` */
export const TRANSITION_FAST = `all ${DURATION_FAST}ms ${EASING_STANDARD}`;

/** Normal CSS transition string: `all 300ms cubic-bezier(...)` */
export const TRANSITION_NORMAL = `all ${DURATION_NORMAL}ms ${EASING_STANDARD}`;
