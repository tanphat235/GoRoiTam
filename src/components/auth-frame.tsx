import type { ReactNode } from "react";
import { Landscape, Petals } from "./scenery";

/** Split layout for account pages: calm scenery on the left, the form on the right. */
export function AuthFrame({ title, sub, children, footer }: { title: string; sub?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fade-up grid overflow-hidden rounded-[2rem] border border-border bg-surface shadow-soft md:grid-cols-2">
      <div className="relative hidden min-h-[520px] md:block">
        <Landscape idp="auth" className="absolute inset-0 h-full w-full" />
        <Petals count={5} />
        <blockquote className="absolute inset-x-8 bottom-8 rounded-2xl bg-surface/75 p-4 text-center font-serif italic text-foreground backdrop-blur">
          “Tâm an thì vạn sự an.”
        </blockquote>
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-10">
        <h1 className="font-serif text-3xl font-semibold">{title}</h1>
        {sub && <p className="mt-2 text-sm text-muted">{sub}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}
