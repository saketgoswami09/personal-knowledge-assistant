"use client";

/**
 * components/ui/LineSidebar.tsx
 *
 * React Bits — LineSidebar component (TypeScript port).
 * Proximity-driven animated sidebar nav with marker lines and cursor tracking.
 *
 * @see https://reactbits.dev/components/line-sidebar
 */

import { useRef, useState, useCallback, useEffect } from "react";
import "./LineSidebar.css";

// ── Types ──────────────────────────────────────────────────────────────────────

type FalloffCurve = "linear" | "smooth" | "sharp";

interface LineSidebarProps {
  /** Labels rendered as the list of sidebar entries. */
  items?: string[];
  /** Color items and markers shift toward as the cursor gets close. */
  accentColor?: string;
  /** Resting color of the item labels. */
  textColor?: string;
  /** Resting color of the leading marker lines. */
  markerColor?: string;
  /** Show the zero-padded index before each label. */
  showIndex?: boolean;
  /** Show the marker lines (and short ticks) beside each item. */
  showMarker?: boolean;
  /** Vertical distance in pixels within which the cursor influences an item. */
  proximityRadius?: number;
  /** Maximum horizontal shift in pixels the label slides at full proximity. */
  maxShift?: number;
  /** Curve mapping cursor distance to the proximity effect. */
  falloff?: FalloffCurve;
  /** Length in pixels of the marker line; the in-between ticks scale from this too. */
  markerLength?: number;
  /** Gap in pixels between the labels and the markers. */
  markerGap?: number;
  /** Length of the in-between ticks as a fraction of markerLength. */
  tickScale?: number;
  /** When true, the in-between ticks also grow with cursor proximity. */
  scaleTick?: boolean;
  /** Vertical gap between items in pixels. */
  itemGap?: number;
  /** Font size of the labels in rem. */
  fontSize?: number;
  /** Transition duration in milliseconds for the proximity response. */
  smoothing?: number;
  /** Index of the item selected on mount. */
  defaultActive?: number | null;
  /** Called when an item is clicked; the clicked item also becomes active. */
  onItemClick?: (index: number, label: string) => void;
  /** Additional CSS classes for the outer wrapper. */
  className?: string;
}

// ── Falloff curves ─────────────────────────────────────────────────────────────

const FALLOFF_CURVES: Record<FalloffCurve, (p: number) => number> = {
  linear: (p) => p,
  smooth: (p) => p * p * (3 - 2 * p),
  sharp: (p) => p * p * p,
};

// ── Default items ──────────────────────────────────────────────────────────────

const DEFAULT_ITEMS = [
  "Overview",
  "Components",
  "Animations",
  "Backgrounds",
  "Showcase",
  "Playground",
  "Templates",
  "Changelog",
  "Community",
  "Resources",
  "Documentation",
  "Support",
];

// ── Component ─────────────────────────────────────────────────────────────────

export function LineSidebar({
  items = DEFAULT_ITEMS,
  accentColor = "#A855F7",
  textColor = "#c4c4c4",
  markerColor = "#6c6c6c",
  showIndex = true,
  showMarker = true,
  proximityRadius = 100,
  maxShift = 30,
  falloff = "smooth",
  markerLength = 60,
  markerGap = 0,
  tickScale = 0.5,
  scaleTick = true,
  itemGap = 20,
  fontSize = 1.1,
  smoothing = 100,
  defaultActive = null,
  onItemClick,
  className = "",
}: LineSidebarProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const targetsRef = useRef<number[]>([]);
  const currentRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const activeRef = useRef<number | null>(defaultActive);
  const smoothingRef = useRef<number>(smoothing);
  const [activeIndex, setActiveIndex] = useState<number | null>(defaultActive);

  activeRef.current = activeIndex;
  smoothingRef.current = smoothing;

  // Single rAF loop that eases every item's --effect toward its target using
  // frame-rate independent exponential smoothing, so color, shift and scale
  // all move together without staggering CSS transitions.
  const runFrame = useCallback((now: number) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05);
    lastRef.current = now;
    const tau = Math.max(smoothingRef.current, 1) / 1000;
    const k = 1 - Math.exp(-dt / tau);

    let moving = false;
    const els = itemRefs.current;
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (!el) continue;
      const target = Math.max(
        targetsRef.current[i] ?? 0,
        activeRef.current === i ? 1 : 0
      );
      const cur = currentRef.current[i] ?? 0;
      const next = cur + (target - cur) * k;
      const settled = Math.abs(target - next) < 0.0015;
      const value = settled ? target : next;
      currentRef.current[i] = value;
      el.style.setProperty("--effect", value.toFixed(4));
      if (!settled) moving = true;
    }

    rafRef.current = moving ? requestAnimationFrame(runFrame) : null;
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLUListElement>) => {
      const list = listRef.current;
      if (!list) return;
      const rect = list.getBoundingClientRect();
      const pointerY = e.clientY - rect.top;
      const ease = FALLOFF_CURVES[falloff] ?? FALLOFF_CURVES.linear;
      const els = itemRefs.current;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;
        const center = el.offsetTop + el.offsetHeight / 2;
        const distance = Math.abs(pointerY - center);
        targetsRef.current[i] = ease(
          Math.max(0, 1 - distance / proximityRadius)
        );
      }
      startLoop();
    },
    [falloff, proximityRadius, startLoop]
  );

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0);
    startLoop();
  }, [startLoop]);

  const handleClick = useCallback(
    (index: number, label: string) => {
      setActiveIndex(index);
      onItemClick?.(index, label);
    },
    [onItemClick]
  );

  useEffect(() => {
    startLoop();
  }, [activeIndex, startLoop]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const navClass = [
    "line-sidebar",
    showMarker ? "line-sidebar--markers" : "",
    scaleTick ? "line-sidebar--scale-tick" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <nav
      className={navClass}
      style={
        {
          "--accent-color": accentColor,
          "--text-color": textColor,
          "--marker-color": markerColor,
          "--marker-length": `${markerLength}px`,
          "--marker-gap": `${markerGap}px`,
          "--tick-scale": tickScale,
          "--max-shift": `${maxShift}px`,
          "--item-gap": `${itemGap}px`,
          "--font-size": `${fontSize}rem`,
          "--smoothing": `${smoothing}ms`,
        } as React.CSSProperties
      }
    >
      <ul
        ref={listRef}
        className="line-sidebar__list"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {items.map((label, index) => (
          <li
            key={`${label}-${index}`}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="line-sidebar__item"
            aria-current={activeIndex === index ? "true" : undefined}
            onClick={() => handleClick(index, label)}
          >
            {showMarker && (
              <span className="line-sidebar__marker" aria-hidden="true" />
            )}
            <span className="line-sidebar__label">
              {showIndex && (
                <span className="line-sidebar__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              <span className="line-sidebar__text">{label}</span>
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default LineSidebar;
