"use client";

import { useRef } from "react";
import { MOTION_OK, ScrollTrigger, gsap, motionAllowed, useGSAP } from "@/lib/gsap";

/**
 * Act 3, the quiet before the peak: one breath together (in 4s, out 6s). The loop only runs while
 * the section is on screen, and is a still circle for reduced-motion users.
 */
export function BreathAct() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!motionAllowed()) return; // static final state
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const label = root.current!.querySelector<HTMLElement>("[data-breath-label]")!;
        const tl = gsap.timeline({ repeat: -1, paused: true });
        tl.call(() => { label.textContent = "Hít vào"; })
          .to("[data-breath-ring]", { scale: 1, duration: 4, ease: "sine.inOut" })
          .to("[data-breath-core]", { scale: 1.15, duration: 4, ease: "sine.inOut" }, "<")
          .call(() => { label.textContent = "Thở ra"; })
          .to("[data-breath-ring]", { scale: 0.55, duration: 6, ease: "sine.inOut" })
          .to("[data-breath-core]", { scale: 0.85, duration: 6, ease: "sine.inOut" }, "<");
        gsap.set("[data-breath-ring]", { scale: 0.55 });
        // Performance: pause the loop whenever the section is off screen.
        ScrollTrigger.create({ trigger: root.current, start: "top 85%", end: "bottom 15%", onToggle: (self) => (self.isActive ? tl.play() : tl.pause()) });
        gsap.from("[data-breath-copy]", { x: -30, opacity: 0, duration: 1, ease: "power2.out", scrollTrigger: { trigger: root.current, start: "top 70%" } });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="breath-title" className="grid items-center gap-10 py-16 md:grid-cols-[1.2fr_1fr]">
      <div data-breath-copy>
        <h2 id="breath-title" className="font-serif text-3xl font-semibold leading-tight sm:text-5xl">
          Khoan đã.
          <br />
          Thở cùng mình một nhịp.
        </h2>
        <p className="mt-4 max-w-md text-muted">Hít vào bốn giây, thở ra sáu giây. Chỉ cần theo vòng tròn, không cần nghĩ gì thêm.</p>
      </div>
      <div className="relative mx-auto flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72" role="img" aria-label="Vòng tròn hướng dẫn hít vào và thở ra">
        <span data-breath-ring className="absolute inset-0 rounded-full border-2 border-sage bg-primary-soft/60" />
        <span data-breath-core className="absolute inset-[30%] rounded-full bg-primary/20" />
        <span data-breath-label className="relative font-serif text-xl text-primary">Hít vào</span>
      </div>
    </section>
  );
}
