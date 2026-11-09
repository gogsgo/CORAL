import type { ReactNode } from "react";

/**
 * Global SVG filter. Remaps any copperplate plate so paper clamps to pure
 * white and strokes land on brand cobalt. One filter for the whole page, so
 * five separately generated plates read as one edition.
 */
export function CobaltFilterDefs() {
  return (
    <svg aria-hidden className="pointer-events-none fixed h-0 w-0 overflow-hidden opacity-0">
      <defs>
        <filter id="cobalt-etching-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="
              0.299 0.587 0.114 0 0
              0.299 0.587 0.114 0 0
              0.299 0.587 0.114 0 0
              0     0     0     1 0"
            result="gray"
          />
          <feComponentTransfer in="gray" result="contrasted">
            <feFuncR type="linear" slope="1.16" intercept="-0.06" />
            <feFuncG type="linear" slope="1.16" intercept="-0.06" />
            <feFuncB type="linear" slope="1.16" intercept="-0.06" />
          </feComponentTransfer>
          <feComponentTransfer in="contrasted">
            <feFuncR type="table" tableValues="0.118 0.22 0.52 0.85 1.0" />
            <feFuncG type="table" tableValues="0.196 0.30 0.58 0.88 1.0" />
            <feFuncB type="table" tableValues="0.792 0.83 0.90 0.96 1.0" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}

/** Stacked classical serif wordmark. Links home from the header. */
export function StackedWordmark({
  variant = "ink",
  size = "sm",
  asLink = true,
}: {
  variant?: "cobalt" | "white" | "ink";
  size?: "sm" | "lg";
  asLink?: boolean;
}) {
  const tone =
    variant === "white" ? "text-white" : variant === "cobalt" ? "text-cobalt" : "text-ink";

  const parts: ReactNode =
    size === "lg" ? (
      <>
        <span className="text-[28px] font-normal sm:text-[34px]">CORAL</span>
        <span className="pl-5 text-[25px] font-normal sm:text-[30px]">ADAPTIVE</span>
        <span className="pl-2 text-[28px] font-normal sm:text-[34px]">AGENT</span>
      </>
    ) : (
      <>
        <span className="text-[14px] font-normal sm:text-[15.5px]">CORAL</span>
        <span className="pl-3 text-[12.5px] font-normal sm:text-[14px]">ADAPTIVE</span>
        <span className="pl-1 text-[14px] font-normal sm:text-[15.5px]">AGENT</span>
      </>
    );

  const classes = `inline-flex select-none flex-col items-start font-serif-display uppercase leading-[0.82] tracking-[-0.01em] ${tone}`;

  if (!asLink) {
    return <div className={classes}>{parts}</div>;
  }

  return (
    <a
      href="/"
      aria-label="CORAL — Cultivating On-chain Reasoning & Adaptive Learning"
      className={`${classes} transition-colors duration-200 hover:text-cobalt`}
    >
      {parts}
    </a>
  );
}

/** Classical double-ring monogram seal. Used once in the hero, once in the banner. */
export function MonogramSeal({
  variant = "cobalt",
  className = "h-11 w-11",
}: {
  variant?: "cobalt" | "white";
  className?: string;
}) {
  const stroke = variant === "white" ? "#FFFFFF" : "#1E32CA";
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label="CORAL seal">
      <circle cx="32" cy="32" r="29.5" stroke={stroke} strokeWidth="1.2" />
      <circle cx="32" cy="32" r="26.5" stroke={stroke} strokeWidth="0.75" strokeDasharray="2 1.5" />
      <circle cx="32" cy="32" r="24.2" stroke={stroke} strokeWidth="0.9" />
      <path
        d="M39.5 21.5C37.2 18.8 33.8 17.5 29.8 17.5C22.4 17.5 17.2 23.6 17.2 32C17.2 40.4 22.4 46.5 29.8 46.5C34.2 46.5 37.6 44.6 39.8 41.5"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M29.8 19.2C23.8 19.2 19.6 24.6 19.6 32C19.6 39.4 23.8 44.8 29.8 44.8"
        stroke={stroke}
        strokeWidth="0.85"
      />
      <path d="M39.5 18.5V23.2" stroke={stroke} strokeWidth="1.3" />
      <path d="M39.8 40.2V44.2" stroke={stroke} strokeWidth="1.3" />
      <path
        d="M35.5 16.5C31.5 21.5 30.5 27.5 33.8 32.5C37.1 37.5 36.2 43.2 31.5 47.8"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M33.2 25.5L38.5 21.8M36.2 23.4L39.2 24.5" stroke={stroke} strokeWidth="1.05" strokeLinecap="round" />
      <path d="M35.4 35.5L41.2 32.2M38.5 33.7L41.5 35.2" stroke={stroke} strokeWidth="1.05" strokeLinecap="round" />
      <path d="M32.2 29.5L26.8 26.2" stroke={stroke} strokeWidth="1.05" strokeLinecap="round" />
      <circle cx="38.8" cy="21.5" r="1.1" fill={stroke} />
      <circle cx="41.5" cy="31.9" r="1.1" fill={stroke} />
      <circle cx="26.4" cy="25.9" r="1.1" fill={stroke} />
    </svg>
  );
}

/** White coral corner flourish for the cobalt banner. */
export function CoralCorners({ position, className = "" }: { position: "top-left" | "bottom-right"; className?: string }) {
  const buds =
    position === "top-left"
      ? ([[138, 36], [164, 20], [196, 126], [168, 188], [128, 198], [78, 186], [52, 228], [110, 230], [148, 86], [176, 98], [112, 74]] as const)
      : ([[88, 56], [58, 124], [112, 222], [84, 238], [176, 68], [124, 58], [78, 158], [106, 170]] as const);

  if (position === "top-left") {
    return (
      <svg viewBox="0 0 260 300" fill="none" className={className} aria-hidden>
        <path d="M-10 40C35 52 78 78 118 118M118 118C138 138 156 162 168 188M118 118C144 112 172 115 196 126" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M42 62C68 42 102 32 138 36M96 36C116 22 142 16 164 20" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M55 72C48 110 56 150 78 186M62 128C86 146 112 168 128 198" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M-6 110C28 122 62 148 88 182M28 126C22 162 32 198 52 228" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M0 160C45 165 85 190 110 230M0 175C38 182 72 205 92 242M0 192C30 200 58 220 74 252" stroke="white" strokeWidth="0.85" strokeOpacity="0.85" />
        {buds.map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="3.2" stroke="white" strokeWidth="1" fill="#1E32CA" />
            <circle cx={cx} cy={cy} r="1.1" fill="white" />
          </g>
        ))}
        <path d="M84 90L112 74M112 74L148 86M112 74L126 52M148 86L176 98M148 86L166 68" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 260 260" fill="none" className={className} aria-hidden>
      <path d="M270 230C220 210 175 178 138 136M138 136C116 112 98 84 88 56M138 136C110 142 82 138 58 124" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M210 198C184 218 148 228 112 222M156 222C134 236 108 242 84 238" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M198 184C206 144 198 104 176 68M190 128C166 110 140 88 124 58" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M170 166L142 182M142 182L106 170M142 182L128 204M106 170L78 158" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
      {buds.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="3.2" stroke="white" strokeWidth="1" fill="#1E32CA" />
          <circle cx={cx} cy={cy} r="1.1" fill="white" />
        </g>
      ))}
    </svg>
  );
}

/** Thin north-east arrow. Carries the "this row opens" cue on editorial rows. */
export function DiagonalArrow({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={`row-arrow inline-block ${className}`} aria-hidden>
      <path
        d="M3.5 12.5L12.5 3.5M12.5 3.5H5.5M12.5 3.5V10.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Down arrow for the hero scroll cue. */
export function DownArrow({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M10 3.5V16.5M10 16.5L5.2 11.7M10 16.5L14.8 11.7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
