"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/** Runs before paint (inlined in <head>) so the saved theme applies without a flash. */
export const themeScript = `try{var t=localStorage.getItem("grt-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

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
