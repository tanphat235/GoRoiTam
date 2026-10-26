"use client";

import { useRef, type ReactNode } from "react";
import { Landscape, Petals } from "@/components/scenery";
import { DESKTOP, MOTION_OK, gsap, motionAllowed, useGSAP } from "@/lib/gsap";

const MAX_RIPPLES = 10;
// Lowest point of the shoreline in the landscape viewBox (0 0 800 420): everything below is lake.
const SHORE_Y = 345;

/**
 * Hero with a dimensional landscape: sun, far ridge, mid ridge, shore and lotus move at different
 * rates while scrolling (depth by differential movement), and the copy rises in on load.
 *
 * Signature move: touch the lake. Moving over or tapping the water sends out ripple rings and a
 * lotus petal drifts down onto the surface where you touched.
 */
export function HeroScene({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const last = useRef({ t: 0, x: 0, y: 0 });

  const { contextSafe } = useGSAP(
    () => {
      if (!motionAllowed()) return; // static final state
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from("[data-hero-line]", { yPercent: 40, opacity: 0, duration: 1.1, ease: "power3.out", stagger: 0.12, delay: 0.1 });
        gsap.from("[data-hero-rise]", { y: 24, opacity: 0, duration: 0.9, ease: "power2.out", stagger: 0.1, delay: 0.45 });
        const depth = { sun: 70, far: 46, mid: 26, near: 10, front: -18 };
        const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 1 } });
        for (const [name, y] of Object.entries(depth)) tl.to(`[data-depth="${name}"]`, { y, ease: "none" }, 0);
        tl.to("[data-hero-copy]", { y: -40, opacity: 0.35, ease: "none" }, 0);
      });
      mm.add(`${MOTION_OK} and ${DESKTOP}`, () => {
        // Gentle drift of the far planes with the pointer, through one reusable tween per axis.
        const far = gsap.quickTo("[data-depth='far']", "x", { duration: 1.2, ease: "power3" });
        const mid = gsap.quickTo("[data-depth='mid']", "x", { duration: 1.2, ease: "power3" });
        const onMove = (e: PointerEvent) => {
          const r = root.current!.getBoundingClientRect();
          const dx = (e.clientX - r.left) / r.width - 0.5;
          far(dx * -14);
          mid(dx * -24);
        };
        root.current!.addEventListener("pointermove", onMove);
        return () => root.current?.removeEventListener("pointermove", onMove);
      });
    },
    { scope: root },
  );

  // Created after setup, so wrapped in contextSafe: cleaned up with the component.
  const ripple = contextSafe((x: number, y: number, shoreTop: number, withPetal: boolean) => {
    const host = layer.current;
    if (!host || host.childElementCount > MAX_RIPPLES) return;
    // Nothing is ever drawn above the shoreline: the layer is clipped to the lake.
    host.style.clipPath = `inset(${Math.max(shoreTop, 0)}px 0 0 0)`;
    const ring = (delay: number, size: number) => {
      const el = document.createElement("span");
      el.className = "pointer-events-none absolute rounded-[50%] border-2 border-primary/45";
      Object.assign(el.style, { left: `${x - size / 2}px`, top: `${y - size / 8}px`, width: `${size}px`, height: `${size / 4}px` });
      host.appendChild(el);
      gsap.fromTo(el, { scale: 0.1, opacity: 0.9 }, { scale: 1, opacity: 0, duration: 1.8, delay, ease: "power2.out", onComplete: () => el.remove() });
    };
    if (withPetal) {
      const petal = document.createElement("span");
      petal.className = "pointer-events-none absolute h-3 w-4 rounded-[80%_0_80%_0] bg-lotus";
      Object.assign(petal.style, { left: `${x - 8}px`, top: `${y - 6}px` });
      host.appendChild(petal);
      gsap.fromTo(petal, { y: -110, x: -30, rotation: -40, opacity: 0 }, {
        y: 0, x: 0, rotation: 200, opacity: 1, duration: 1.4, ease: "sine.inOut",
        onComplete: () => {
          ring(0, 150);
          ring(0.25, 230);
          gsap.to(petal, { opacity: 0, y: 4, duration: 1.6, delay: 0.4, onComplete: () => petal.remove() });
        },
      });
    } else {
      ring(0, 140);
      ring(0.2, 220);
    }
  });

  /**
   * Maps the pointer into the landscape's own coordinates (it is scaled with "slice", so a fixed
   * percentage of the box would land on the hills at some sizes). Returns a point only when it is
   * on the lake, below the shoreline, and not on the form, chips or links laid over the water.
   */
  const lakePoint = (e: React.PointerEvent) => {
    if (!motionAllowed() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
    if ((e.target as HTMLElement).closest("a, button, input, textarea, select, label, form")) return null;
    const svg = root.current?.querySelector<SVGSVGElement>("svg[data-landscape]");
    const ctm = svg?.getScreenCTM();
    if (!root.current || !ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    if (p.y < SHORE_Y) return null;
    const box = root.current.getBoundingClientRect();
    const shore = new DOMPoint(p.x, SHORE_Y).matrixTransform(ctm);
    return { x: e.clientX - box.left, y: e.clientY - box.top, shoreTop: shore.y - box.top };
  };

  return (
    <section
      ref={root}
      className="relative overflow-hidden rounded-[2rem] border border-border shadow-soft"
      onPointerDown={(e) => {
        const p = lakePoint(e);
        if (p) ripple(p.x, p.y, p.shoreTop, true);
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const now = performance.now();
        if (now - last.current.t < 260) return;
        const p = lakePoint(e);
        if (!p || Math.hypot(p.x - last.current.x, p.y - last.current.y) < 40) return;
        last.current = { t: now, x: p.x, y: p.y };
        ripple(p.x, p.y, p.shoreTop, false);
      }}
    >
      <Landscape idp="hero" className="absolute inset-0 h-full w-full" />
      <Petals />
      <div ref={layer} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" />
      <div data-hero-copy className="relative">{children}</div>
    </section>
  );
}
