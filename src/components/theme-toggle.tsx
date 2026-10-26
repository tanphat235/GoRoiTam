"use client";

import { CirclePause, Moon, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Runs before paint (inlined in <head>) so the saved theme and motion choice apply without a flash.
 * "reduce-motion" is set when the visitor chose it in the app OR their OS asks for reduced motion.
 */
export const themeScript = `try{var d=document.documentElement,t=localStorage.getItem("grt-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))d.classList.add("dark");if(localStorage.getItem("grt-motion")==="reduce"||matchMedia("(prefers-reduced-motion: reduce)").matches)d.classList.add("reduce-motion")}catch(e){}`;

/** In-app switch for animations (petals, swaying lotus, scroll effects). Saved per browser. */
export function MotionToggle() {
  const [reduced, setReduced] = useState(false);
  const [osForced, setOsForced] = useState(false);
  useEffect(() => {
    setReduced(document.documentElement.classList.contains("reduce-motion"));
    setOsForced(matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  const toggle = () => {
    const next = !reduced;
    try { localStorage.setItem("grt-motion", next ? "reduce" : "full"); } catch { /* storage blocked: applies to this page only */ }
    // Scroll-driven scenes are set up once per page, so reload to rebuild them in the chosen mode.
    window.location.reload();
  };
  const label = osForced
    ? "Hệ điều hành của bạn đang bật giảm chuyển động"
    : reduced ? "Bật lại hiệu ứng chuyển động" : "Giảm chuyển động";
  return (
    <button
      onClick={toggle}
      disabled={osForced}
      aria-pressed={reduced}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {reduced ? <CirclePause size={18} aria-hidden /> : <Sparkles size={18} aria-hidden />}
    </button>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("grt-theme", next ? "dark" : "light"); } catch { /* storage blocked: theme just won't persist */ }
  };
  return (
    <button onClick={toggle} aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"} className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-primary">
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
