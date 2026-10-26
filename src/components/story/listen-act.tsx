"use client";

import { useRef } from "react";
import { Lotus } from "@/components/lotus";
import { DESKTOP, HEADER_OFFSET, MOTION_OK, gsap, motionAllowed, useGSAP } from "@/lib/gsap";

const PARTS = [
  {
    title: "Thấu hiểu",
    text: "Nổi giận rồi hối hận cho thấy bạn rất thương gia đình. Cảm giác day dứt ấy không làm bạn thành người xấu.",
  },
  {
    title: "Góc nhìn Phật pháp",
    text: "Cơn giận sinh ra từ nhiều điều kiện: mệt mỏi, kỳ vọng, lời nói chạm vào nỗi đau cũ. Thấy được các điều kiện đó, ta bớt tự trách và biết chỗ có thể thay đổi.",
  },
  {
    title: "Thực hành",
    text: "Khi thấy nóng trong người, dừng lại ba hơi thở trước khi nói. Tối nay, viết ra một điều bạn biết ơn ở người thân đó.",
  },
];

/** Act 2, "được lắng nghe": an example answer unfolds part by part as you scroll (pinned on desktop). */
export function ListenAct() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!motionAllowed()) return; // static final state
      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and ${DESKTOP}`, () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: `top ${HEADER_OFFSET}px`, end: "+=110%", scrub: 1, pin: true },
        });
        tl.from("[data-q]", { y: 30, opacity: 0, duration: 0.6 })
          .from("[data-part]", { y: 36, opacity: 0, duration: 0.8, stagger: 0.9 }, "+=0.3")
          .from("[data-listen-note]", { opacity: 0, duration: 0.5 });
      });
      mm.add(`${MOTION_OK} and (max-width: 767px)`, () => {
        gsap.from("[data-part], [data-q]", {
          y: 24, opacity: 0, duration: 0.7, stagger: 0.18, ease: "power2.out",
          scrollTrigger: { trigger: root.current, start: "top 75%" },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="listen-title" className="relative grid items-center gap-8 py-10 md:min-h-[78vh] md:grid-cols-[0.9fr_1.1fr] md:gap-14">
      <div>
        <h2 id="listen-title" className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
          Được lắng nghe,
          <br />
          không bị phán xét.
        </h2>
        <p className="mt-4 max-w-md text-pretty text-muted">
          Mỗi câu trả lời đi qua ba bước: hiểu cảm xúc của bạn trước, nhìn lại bằng giáo lý, rồi gợi ý một việc nhỏ làm được ngay hôm nay.
        </p>
        <p data-listen-note className="mt-6 text-xs text-muted">Ví dụ minh họa. Câu trả lời thật dựa trên điều bạn kể.</p>
      </div>

      <div className="space-y-4">
        <p data-q className="ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-primary px-5 py-3 text-sm text-white shadow-soft dark:text-[#10170f]">
          Mình hay nổi giận với người thân rồi lại hối hận.
        </p>
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft"><Lotus size={26} /></span>
          <div className="flex-1 space-y-3">
            {PARTS.map((p) => (
              <article key={p.title} data-part className="rounded-3xl rounded-tl-md border border-border bg-surface px-5 py-4 shadow-soft">
                <h3 className="font-serif text-base font-semibold text-primary">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed">{p.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
