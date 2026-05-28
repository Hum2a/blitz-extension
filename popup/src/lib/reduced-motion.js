/** Respect prefers-reduced-motion for Framer Motion and CSS. */
export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const reducedMotionTransition = { duration: 0.01 };

export function motionProps(reduced, animated) {
  return reduced ? { initial: false, animate: animated, transition: reducedMotionTransition } : animated;
}
