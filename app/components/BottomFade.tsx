"use client";

export default function BottomFade() {
  return (
    <div className="absolute inset-x-0 bottom-0 z-[1] pointer-events-none h-24 md:h-32">
      <div
        className="absolute inset-0 backdrop-blur-[0.5px]"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 35%, transparent 50%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 35%, transparent 50%)",
        }}
      />
      <div
        className="absolute inset-0 backdrop-blur-[1px]"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 25%, black 40%, black 60%, transparent 75%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 25%, black 40%, black 60%, transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 50%, black 65%, black 85%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 50%, black 65%, black 85%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0 backdrop-blur-[3px]"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 75%, black 90%, black 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 75%, black 90%, black 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, rgba(20, 18, 31, 0.6) 50%, #14121f 100%)",
        }}
      />
    </div>
  );
}