"use client";

import React, { useEffect, useRef } from "react";

export const JUPITER_ART = `
                    ..-------..
                 .-':::::::::::'-.
               .':::::::::::::::::'.
              /:::::::::::::::::::::\\
             |:::::::::::::::::::::::|
             |:::::::::::::::::::::::|
             |:::::::::::::::::::::::|
              \\:::::::::::::::::::::/
               '.:::::::::::::::::.'
                 '-.:::::::::::-'
                    ''-------''
`;

interface AsciiParticleHeroProps {
  art?: string;
}

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  char: string;
  color: string;
  size: number;
}

export function AsciiParticleHero({ art = JUPITER_ART }: AsciiParticleHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const friction = 0.88;
    const springForce = 0.04;
    const repulsionStrength = 6.0;
    const influenceRadius = 120;

    const initParticles = (width: number, height: number) => {
      particles = [];
      const lines = art.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length === 0) return;

      const numRows = lines.length;
      const numCols = Math.max(...lines.map((l) => l.length));

      const spacingX = Math.min(width / (numCols * 1.5), 16);
      const spacingY = Math.min(height / (numRows * 1.5), 24);

      const gridWidth = numCols * spacingX;
      const gridHeight = numRows * spacingY;
      const startX = (width - gridWidth) / 2;
      const startY = (height - gridHeight) / 2;

      for (let r = 0; r < numRows; r++) {
        const line = lines[r];
        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          if (char === " ") continue;

          const baseX = startX + c * spacingX;
          const baseY = startY + r * spacingY;

          let color = "rgba(139, 92, 246, 0.45)"; // Violet-500
          if (char === "." || char === "-") {
            color = "rgba(167, 139, 250, 0.3)";
          } else if (char === ":" || char === "'") {
            color = "rgba(196, 181, 253, 0.4)";
          } else if (char === "/" || char === "\\") {
            color = "rgba(124, 58, 237, 0.55)";
          }

          particles.push({
            x: baseX + (Math.random() - 0.5) * 40,
            y: baseY + (Math.random() - 0.5) * 40,
            baseX,
            baseY,
            vx: 0,
            vy: 0,
            char,
            color,
            size: 11,
          });
        }
      }
    };

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      initParticles(rect.width, rect.height);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = mouseRef.current;

      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const dxBase = p.baseX - p.x;
        const dyBase = p.baseY - p.y;
        p.vx += dxBase * springForce;
        p.vy += dyBase * springForce;

        if (mouse.x !== null && mouse.y !== null) {
          const dxMouse = p.x - mouse.x;
          const dyMouse = p.y - mouse.y;
          const dist = Math.hypot(dxMouse, dyMouse);

          if (dist < influenceRadius) {
            const force = (influenceRadius - dist) / influenceRadius;
            const angle = Math.atan2(dyMouse, dxMouse);
            p.vx += Math.cos(angle) * force * repulsionStrength;
            p.vy += Math.sin(angle) * force * repulsionStrength;
          }
        }

        p.vx *= friction;
        p.vy *= friction;
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = p.color;
        ctx.fillText(p.char, p.x, p.y);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [art]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ pointerEvents: "auto" }}
    />
  );
}
