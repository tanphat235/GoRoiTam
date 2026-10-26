/**
 * Hand-drawn style landscape (misty mountains, pagoda, lotus pond) as inline SVG.
 * Every edge is curved or fades out (no straight horizontal lines), so nothing cuts across
 * text laid over it. Follows the light/dark palette through CSS variables. Decorative only.
 */
export function Landscape({ className = "", lotus = true, idp = "ls" }: { className?: string; lotus?: boolean; idp?: string }) {
  const id = (n: string) => `${idp}-${n}`;
  const url = (n: string) => `url(#${id(n)})`;
  return (
    <svg data-landscape viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sky-top)" />
          <stop offset="1" stopColor="var(--sky-bottom)" />
        </linearGradient>
        <radialGradient id={id("sun")} cx="0.72" cy="0.22" r="0.28">
          <stop offset="0" stopColor="var(--sand)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--sand)" stopOpacity="0" />
        </radialGradient>
        {/* soft on every side: used for mist banks and the shoreline haze */}
        <radialGradient id={id("haze")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--surface)" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="var(--surface)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--surface)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("water")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--water)" />
          <stop offset="1" stopColor="var(--surface)" />
        </linearGradient>
        <linearGradient id={id("far")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--mount-far)" />
          <stop offset="1" stopColor="var(--mount-far)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="800" height="420" fill={url("sky")} />
      <rect data-depth="sun" width="800" height="420" fill={url("sun")} />

      {/* Planes are grouped by depth (data-depth): the hero moves them at different rates on scroll. */}
      <g data-depth="far">
        {/* far ridge fades into the haze instead of ending on a line */}
        <path d="M0 230C60 200 80 160 130 165c40 5 60-45 120-50 50-3 70 60 130 45 50-12 70-32 120-20 60 15 80-30 140-22 60 8 90 47 160 32V330H0Z" fill={url("far")} opacity="0.9" />
        <g className="mist-slow"><ellipse cx="400" cy="196" rx="520" ry="34" fill={url("haze")} /></g>
      </g>

      <g data-depth="mid">
        <path d="M0 265c70-25 100-60 160-55s90-30 150-20 80 50 140 42 90-27 150-17 90-10 140-5c30 3 50 17 60 25V400H0Z" fill="var(--mount-mid)" opacity="0.8" />
        <Pagoda x={640} y={128} />
        <g className="mist"><ellipse cx="380" cy="276" rx="540" ry="38" fill={url("haze")} /></g>
      </g>

      <g data-depth="near">
        {/* starts below the lowest point of the hill crest, and the hill is opaque, so its top edge never shows */}
        <rect y="310" width="800" height="140" fill={url("water")} />
        {/* near hills: curved top and a wavy shoreline, softened by haze */}
        <path d="M0 305c90-25 160-37 240-20s140-3 220-5 160-18 240-10c40 4 80 12 100 15v45c-100 8-200-4-300 2s-200-8-300-2c-80 5-140-2-200 4Z" fill="var(--mount-near)" />
        <ellipse cx="400" cy="336" rx="520" ry="16" fill={url("haze")} opacity="0.8" />
        <g stroke="var(--sage)" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5">
          <path className="ripple" d="M470 368q30-5 60 0" />
          <path className="ripple" d="M640 352q25-4 50 0" style={{ animationDelay: "1.8s" }} />
          <path className="ripple" d="M360 392q22-4 44 0" style={{ animationDelay: "3.2s" }} />
        </g>
      </g>

      {lotus && (
        <g data-depth="front">
          <ellipse cx="150" cy="392" rx="58" ry="11" fill="var(--sage)" opacity="0.65" />
          <ellipse cx="300" cy="404" rx="40" ry="8" fill="var(--sage)" opacity="0.5" />
          <ellipse cx="560" cy="398" rx="48" ry="9" fill="var(--sage)" opacity="0.55" />
          <LotusFlower x={150} y={384} scale={1.15} />
          <LotusFlower x={560} y={392} scale={0.8} delay="1.2s" />
          <LotusFlower x={300} y={400} scale={0.55} delay="2.4s" />
        </g>
      )}
    </svg>
  );
}

/** Three-tier pagoda with upturned eaves, drawn around x=0 and resting at y≈82. */
function Pagoda({ x, y }: { x: number; y: number }) {
  const roof = (w: number, ry: number) => {
    const h = w / 2;
    return `M${-h - 7} ${ry} Q${-h / 2} ${ry - 3} 0 ${ry - 13} Q${h / 2} ${ry - 3} ${h + 7} ${ry} Q${h + 1} ${ry + 4} ${h - 4} ${ry + 3} L${-h + 4} ${ry + 3} Q${-h - 1} ${ry + 4} ${-h - 7} ${ry}Z`;
  };
  const tiers = [
    { w: 66, ry: 60, bw: 40, bh: 22 },
    { w: 52, ry: 38, bw: 32, bh: 20 },
    { w: 40, ry: 18, bw: 24, bh: 18 },
  ];
  return (
    <g transform={`translate(${x} ${y})`} fill="var(--mount-near)" opacity="0.95">
      <rect x="-1.2" y="-6" width="2.4" height="12" />
      <circle cx="0" cy="-7" r="2.6" />
      {tiers.map((t) => (
        <g key={t.ry}>
          <rect x={-t.bw / 2} y={t.ry + 2} width={t.bw} height={t.bh} />
          <rect x={-t.bw / 6} y={t.ry + 8} width={t.bw / 3} height={t.bh - 8} fill="var(--sky-bottom)" opacity="0.35" />
          <path d={roof(t.w, t.ry)} />
        </g>
      ))}
      <rect x="-30" y="82" width="60" height="5" rx="1" />
    </g>
  );
}

export function LotusFlower({ x, y, scale = 1, delay = "0s" }: { x: number; y: number; scale?: number; delay?: string }) {
  const petals = [-55, -28, 0, 28, 55];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className="sway" style={{ animationDelay: delay }}>
        {petals.map((deg) => (
          <ellipse key={deg} cx="0" cy="-22" rx="8" ry="22" transform={`rotate(${deg} 0 0)`} fill="var(--lotus)" stroke="#fff" strokeOpacity="0.6" strokeWidth="1" opacity={deg === 0 ? 1 : 0.85} />
        ))}
        <ellipse cx="0" cy="-6" rx="7" ry="4" fill="var(--sand)" />
      </g>
    </g>
  );
}

/** Falling lotus petals overlay. Positions are fixed (no randomness) so server and client render the same. */
export function Petals({ count = 7 }: { count?: number }) {
  const spots = [8, 22, 37, 51, 64, 78, 90, 45, 70, 15];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {spots.slice(0, count).map((left, i) => (
        <span key={i} className="petal" style={{ left: `${left}%`, animationDuration: `${11 + (i % 4) * 3}s`, animationDelay: `${i * 1.7}s` }} />
      ))}
    </div>
  );
}
