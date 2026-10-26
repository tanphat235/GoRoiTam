"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { DESKTOP, HEADER_OFFSET, MOTION_OK, ScrollTrigger, gsap, motionAllowed, useGSAP } from "@/lib/gsap";

/**
 * Petal drawn pointing straight up with its base at (0,0), inside a group translated to the flower
 * centre. Its bounding-box bottom-centre IS the base, so "50% 100%" is the exact hinge to open on.
 */
const petal = (h: number, w: number) =>
  `M0 0C${-w} ${-h * 0.22} ${-w * 1.12} ${-h * 0.66} 0 ${-h}C${w * 1.12} ${-h * 0.66} ${w} ${-h * 0.22} 0 0Z`;
const HINGE = "50% 100%";

const RINGS = [
  { ring: "back", h: 150, w: 26, opacity: 0.5, angles: [-78, -50, -22, 22, 50, 78] },
  { ring: "mid", h: 140, w: 28, opacity: 0.8, angles: [-56, -28, 0, 28, 56] },
  { ring: "front", h: 105, w: 26, opacity: 1, angles: [-34, -11, 11, 34] },
];

/**
 * Act 4, the engineered peak: as you scroll, a lotus opens ring by ring while the sun rises
 * behind it. Pinned on desktop; on phones it plays across the section. Reduced motion: shown open.
 */
export function BloomAct() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const petals = gsap.utils.toArray<SVGPathElement>("[data-petal]", root.current);
      const open = (el: SVGPathElement) => Number(el.dataset.angle);
      // Final (open) state for everyone; motion users then get it animated from a closed bud.
      petals.forEach((el) => gsap.set(el, { rotation: open(el), transformOrigin: HINGE }));

      const build = (trigger: ScrollTrigger.Vars) => {
        const tl = gsap.timeline({ scrollTrigger: trigger });
        tl.from("[data-sun]", { y: 120, scale: 0.5, opacity: 0, transformOrigin: "50% 50%", duration: 2, ease: "power1.out" }, 0)
          .from("[data-sky]", { opacity: 0, duration: 2 }, 0);
        for (const ring of RINGS.map((r) => r.ring)) {
          tl.from(`[data-petal][data-ring="${ring}"]`, {
            rotation: (_: number, el: SVGPathElement) => open(el) * 0.06,
            scaleX: 0.55,
            transformOrigin: HINGE,
            duration: 1.6,
            ease: "power2.out",
            stagger: 0.06,
          }, ring === "back" ? 0.3 : ">-1.1");
        }
        tl.from("[data-pod]", { scale: 0, transformOrigin: "50% 50%", duration: 0.6 }, ">-0.6")
          .from("[data-bloom-line]", { y: 30, opacity: 0, duration: 0.8, stagger: 0.25 }, ">-0.2");
      };

      if (!motionAllowed()) return; // static final state
      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and ${DESKTOP}`, () => build({ trigger: root.current, start: `top ${HEADER_OFFSET}px`, end: "+=150%", scrub: 1, pin: true }));
      mm.add(`${MOTION_OK} and (max-width: 767px)`, () => build({ trigger: root.current, start: "top 85%", end: "bottom 60%", scrub: 1 }));
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="bloom-title" className="relative overflow-hidden rounded-[2rem] border border-border bg-surface shadow-soft">
      <div data-sky aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-sand/45 via-surface to-primary-soft/60" />
      <div className="relative grid items-center gap-6 p-6 sm:p-10 md:min-h-[calc(100vh-7rem)] md:grid-cols-[1.1fr_1fr] md:p-14">
        <svg viewBox="0 0 400 320" className="mx-auto w-full max-w-md" role="img" aria-label="Hoa sen nở">
          <circle data-sun cx="200" cy="165" r="112" fill="var(--sand)" opacity="0.55" />
          <ellipse cx="200" cy="276" rx="170" ry="22" fill="var(--water)" />
          <ellipse cx="128" cy="262" rx="62" ry="12" fill="var(--sage)" opacity="0.7" />
          <ellipse cx="282" cy="268" rx="54" ry="11" fill="var(--sage)" opacity="0.6" />
          <g transform="translate(200 252)">
            {RINGS.map(({ ring, h, w, opacity, angles }) =>
              angles.map((a) => (
                <path key={`${ring}${a}`} data-petal data-ring={ring} data-angle={a} d={petal(h, w)} fill="var(--lotus)" fillOpacity={opacity} stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" />
              )),
            )}
            <ellipse data-pod cx="0" cy="-22" rx="16" ry="9" fill="var(--accent)" opacity="0.85" />
          </g>
        </svg>
        <div>
          <h2 id="bloom-title" className="font-serif text-4xl font-semibold leading-tight sm:text-6xl">
            <span data-bloom-line className="block">Mỗi ngày một chút,</span>
            <span data-bloom-line className="block text-primary">tâm sẽ nở.</span>
          </h2>
          <p data-bloom-line className="mt-5 max-w-sm text-muted">
            Lịch tu tập giữ nhịp cho bạn: thiền, niệm Phật, đọc kinh theo giờ của bạn, đánh dấu hoàn thành và theo dõi chuỗi ngày.
          </p>
          <Link data-bloom-line href="/practice" className="mt-6 inline-flex items-center gap-2 font-medium text-primary hover:underline">
            Lập lịch tu tập <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
