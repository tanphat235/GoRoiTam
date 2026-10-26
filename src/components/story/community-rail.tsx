"use client";

import Link from "next/link";
import { useRef } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { DESKTOP, HEADER_OFFSET, MOTION_OK, gsap, motionAllowed, useGSAP } from "@/lib/gsap";

export type RailPost = { id: string; title: string; excerpt: string; kind: string; author: string; reactions: number; comments: number };

/**
 * Act 5, "không một mình": real recent posts slide sideways as you scroll down (pinned rail on
 * desktop); on phones it is a native swipeable row. Only real posts are shown, never invented ones.
 */
export function CommunityRail({ posts }: { posts: RailPost[] }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!motionAllowed()) return; // static final state
      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and ${DESKTOP}`, () => {
        const distance = () => Math.max(track.current!.scrollWidth - root.current!.clientWidth, 0);
        if (distance() < 40) return; // few posts: nothing to scroll sideways
        gsap.to(track.current, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: { trigger: root.current, start: `top ${HEADER_OFFSET + 24}px`, end: () => `+=${distance()}`, scrub: 1, pin: true, invalidateOnRefresh: true },
        });
      });
      mm.add(MOTION_OK, () => {
        gsap.from("[data-rail-card]", { y: 30, opacity: 0, duration: 0.7, stagger: 0.08, ease: "power2.out", scrollTrigger: { trigger: root.current, start: "top 80%" } });
      });
    },
    { scope: root, dependencies: [posts.length] },
  );

  return (
    <section ref={root} aria-labelledby="rail-title" className="overflow-hidden py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 id="rail-title" className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">Bạn không một mình.</h2>
        <Link href="/community" className="text-sm font-medium text-primary hover:underline">Vào cộng đồng</Link>
      </div>
      <div ref={track} className="flex snap-x gap-4 overflow-x-auto pb-2 md:overflow-visible">
        {posts.map((p) => (
          <Link key={p.id} href={`/community/${p.id}`} data-rail-card className="lift flex w-72 shrink-0 snap-start flex-col rounded-3xl border border-border bg-surface p-5 shadow-soft md:w-80">
            <span className="text-xs text-muted">{p.kind} · {p.author}</span>
            <span className="mt-2 font-serif text-lg font-semibold leading-snug">{p.title}</span>
            <span className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{p.excerpt}</span>
            <span className="mt-4 flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1"><Heart size={14} aria-hidden /> {p.reactions}</span>
              <span className="flex items-center gap-1"><MessageCircle size={14} aria-hidden /> {p.comments}</span>
            </span>
          </Link>
        ))}
        <Link href="/signup" data-rail-card className="flex w-72 shrink-0 snap-start flex-col justify-center rounded-3xl border border-dashed border-sage bg-primary-soft/50 p-6 md:w-80">
          <span className="font-serif text-xl font-semibold">Câu chuyện tiếp theo có thể là của bạn.</span>
          <span className="mt-2 text-sm text-muted">Chia sẻ bằng biệt danh, hoặc ẩn danh hoàn toàn với cộng đồng.</span>
        </Link>
      </div>
    </section>
  );
}
