/**
 * Brand mark: a layered lotus rising from water, with a small light above it.
 * Solid fills only (no gradient ids), so many copies can share a page and it follows light/dark tokens.
 */
export function Lotus({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <circle cx="32" cy="7.5" r="2.8" fill="var(--accent)" />
      <g stroke="var(--primary)" strokeWidth="1.6" strokeLinejoin="round">
        {/* outer petals */}
        <path d="M32 46C24 40 14 38 4.5 40c5 7 16 9 27.5 6Z" fill="var(--sage)" fillOpacity="0.55" />
        <path d="M32 46c8-6 18-8 27.5-6-5 7-16 9-27.5 6Z" fill="var(--sage)" fillOpacity="0.55" />
        {/* side petals */}
        <path d="M32 45c-2.5-10-8.5-18-18-21.5-1 11 5.5 19.5 18 21.5Z" fill="var(--primary-soft)" />
        <path d="M32 45c2.5-10 8.5-18 18-21.5 1 11-5.5 19.5-18 21.5Z" fill="var(--primary-soft)" />
        {/* centre petal */}
        <path d="M32 14c7 8.5 8 19 0 31-8-12-7-22.5 0-31Z" fill="var(--primary)" />
      </g>
      <path d="M32 21v18" stroke="var(--primary-soft)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M12 53c6.5-3 13.5-3 20 0s13.5 3 20 0" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 58.5c4-1.6 8-1.6 12 0s8 1.6 12 0" stroke="var(--sage)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Logo lockup: mark in a soft badge + serif wordmark. */
export function BrandMark({ small }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className={`flex items-center justify-center rounded-2xl bg-primary-soft ring-1 ring-sage/40 ${small ? "h-10 w-10" : "h-12 w-12"}`}>
        <Lotus size={small ? 30 : 36} className="breathe" />
      </span>
      <span className="leading-none">
        <span className={`block font-brand font-semibold tracking-[0.01em] text-primary ${small ? "text-[1.2rem]" : "text-[1.55rem]"}`}>
          Gỡ Rối Tâm
        </span>
        {!small && <span className="mt-1.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-muted">Hỏi · Hiểu · An Lạc</span>}
      </span>
    </span>
  );
}
