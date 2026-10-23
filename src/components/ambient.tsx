import { LotusFlower, Petals } from "./scenery";

/**
 * The app's signature backdrop on every page: petals drifting down and a small lotus pond
 * swaying in the corner. Fixed behind the content, never intercepts clicks, kept faint so
 * text stays readable, and fully static for users who prefer reduced motion.
 */
export function Ambient() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 opacity-60">
        <Petals count={8} />
      </div>
      <svg viewBox="0 0 320 170" className="absolute -right-6 bottom-16 w-56 opacity-70 sm:w-72 lg:bottom-0 lg:w-[22rem]">
        <ellipse cx="190" cy="150" rx="150" ry="22" fill="var(--water)" opacity="0.9" />
        <g stroke="var(--sage)" strokeWidth="1.3" strokeLinecap="round" opacity="0.7">
          <line className="ripple" x1="70" y1="150" x2="140" y2="150" />
          <line className="ripple" x1="200" y1="160" x2="290" y2="160" style={{ animationDelay: "2s" }} />
        </g>
        <ellipse cx="120" cy="143" rx="46" ry="9" fill="var(--sage)" opacity="0.55" />
        <ellipse cx="245" cy="148" rx="38" ry="8" fill="var(--sage)" opacity="0.5" />
        <ellipse cx="185" cy="157" rx="26" ry="5" fill="var(--sage)" opacity="0.4" />
        <path d="M200 145 q4 -26 -2 -44" stroke="var(--mount-near)" strokeWidth="2" fill="none" opacity="0.6" />
        <ellipse cx="198" cy="96" rx="6" ry="11" fill="var(--lotus)" opacity="0.75" className="sway" style={{ animationDelay: "0.8s" }} />
        <LotusFlower x={120} y={138} scale={1.25} />
        <LotusFlower x={248} y={143} scale={0.85} delay="1.6s" />
      </svg>
      <svg viewBox="0 0 200 90" className="absolute -left-8 bottom-16 hidden w-48 opacity-50 sm:block lg:bottom-0 lg:left-60">
        <ellipse cx="90" cy="78" rx="85" ry="13" fill="var(--water)" />
        <ellipse cx="70" cy="74" rx="34" ry="7" fill="var(--sage)" opacity="0.6" />
        <ellipse cx="130" cy="80" rx="22" ry="5" fill="var(--sage)" opacity="0.5" />
        <LotusFlower x={72} y={70} scale={0.7} delay="2.8s" />
      </svg>
    </div>
  );
}
