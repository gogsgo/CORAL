"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A reef drawn from polyps. Deterministic per seed, so the same reef looks the
 * same on every load — this is a diagram, not decoration, and it should be
 * describable.
 */
export function PolypField({ className, count = 46 }: { className?: string; count?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const nodes = usePolypNodes(count);
  const branches = useBranches(nodes);

  return (
    <svg
      viewBox="0 0 640 420"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="A coral colony: each polyp is a decision, branching outward as the reef grows"
    >
      <defs>
        <radialGradient id="polypGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-coral)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--color-coral)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="branchStroke" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--color-coral)" stopOpacity="0.75" />
          <stop offset="60%" stopColor="var(--color-coral)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-teal)" stopOpacity="0.5" />
        </linearGradient>
        <filter id="soften">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* sea floor */}
      <ellipse cx="320" cy="400" rx="240" ry="26" fill="var(--color-shelf)" opacity="0.35" filter="url(#soften)" />

      <g opacity={mounted ? 1 : 0} style={{ transition: "opacity 900ms ease" }}>
        {branches.map((b, i) => (
          <path
            key={`b${i}`}
            d={b.d}
            fill="none"
            stroke="url(#branchStroke)"
            strokeWidth={b.width}
            strokeLinecap="round"
            strokeDasharray="900"
            style={{
              strokeDashoffset: mounted ? 0 : 900,
              transition: `stroke-dashoffset ${1400 + i * 40}ms cubic-bezier(0.16,1,0.3,1)`,
            }}
          />
        ))}

        {nodes.map((n, i) => (
          <g key={`n${i}`}>
            <circle cx={n.x} cy={n.y} r={n.r * 3.4} fill="url(#polypGlow)" opacity={n.win ? 0.5 : 0.12} />
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={n.win ? "var(--color-coral)" : "var(--color-teal)"}
              opacity={n.win ? 0.95 : 0.6}
              style={{
                animation: `pulse-soft ${4 + (i % 5)}s ease-in-out infinite`,
                animationDelay: `${(i % 7) * 0.4}s`,
              }}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

interface Node {
  x: number;
  y: number;
  r: number;
  win: boolean;
  parent: number | null;
}

function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function usePolypNodes(count: number): Node[] {
  const ref = useRef<Node[] | null>(null);
  if (ref.current) return ref.current;
  const rand = mulberry(20261110);
  const nodes: Node[] = [{ x: 320, y: 392, r: 3.2, win: true, parent: null }];

  for (let i = 1; i < count; i++) {
    // Attach to a recent node, biased upward, so it reads as a growing colony.
    const parentIdx = Math.max(0, nodes.length - 1 - Math.floor(rand() * Math.min(nodes.length, 14)));
    const parent = nodes[parentIdx]!;
    const spread = 44 + rand() * 52;
    const angle = -Math.PI / 2 + (rand() - 0.5) * 1.75;
    const x = Math.min(620, Math.max(20, parent.x + Math.cos(angle) * spread));
    const y = Math.min(400, Math.max(20, parent.y + Math.sin(angle) * spread));
    nodes.push({
      x,
      y,
      r: 1.5 + rand() * 2.4,
      win: rand() > 0.36,
      parent: parentIdx,
    });
  }
  ref.current = nodes;
  return nodes;
}

function useBranches(nodes: Node[]): { d: string; width: number }[] {
  const ref = useRef<{ d: string; width: number }[] | null>(null);
  if (ref.current) return ref.current;
  const out = nodes
    .filter((n) => n.parent !== null)
    .map((n) => {
      const p = nodes[n.parent!]!;
      const mx = (p.x + n.x) / 2 + (n.x - p.x) * 0.18;
      const my = (p.y + n.y) / 2;
      return {
        d: `M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${n.x.toFixed(1)},${n.y.toFixed(1)}`,
        width: 0.9,
      };
    });
  ref.current = out;
  return out;
}
