"use client";

interface GrainProps {
  opacity?: number;
  animated?: boolean;
}

export default function Grain({ opacity = 0.35, animated = true }: GrainProps) {
  const svgData = `data:image/svg+xml;utf8,%3Csvg viewBox=%220 0 240 240%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3CfeColorMatrix type=%22saturate%22 values=%220%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E`;

  return (
    <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
      <div
        className={`absolute -inset-[50%] ${animated ? "grain-animate" : ""}`}
        style={{
          backgroundImage: `url("${svgData}")`,
          backgroundSize: "240px",
          opacity,
          mixBlendMode: "soft-light",
        }}
      />
    </div>
  );
}