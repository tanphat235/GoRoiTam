"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Registered once, client-side only (GSAP must never run during SSR).
gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Every scroll/entrance animation is wrapped in this media query; reduced-motion users get the final, static state. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/** False when the visitor turned motion off in the app (html.reduce-motion) or in their OS. */
export const motionAllowed = () =>
  typeof document !== "undefined" && !document.documentElement.classList.contains("reduce-motion");
export const DESKTOP = "(min-width: 768px)";
/** Sticky header height: pinned sections start below it. */
export const HEADER_OFFSET = 64;

export { gsap, ScrollTrigger, useGSAP };
