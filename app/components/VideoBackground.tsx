"use client";

import { useEffect, useRef } from "react";

export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    
    if (!mediaQuery.matches) {
      videoRef.current?.play().catch((e) => console.log("Play failed", e));
    }
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        videoRef.current?.pause();
      } else if (!mediaQuery.matches) {
        videoRef.current?.play().catch((e) => console.log("Play failed", e));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none bg-[#14121f]">
      <video
        ref={videoRef}
        poster="/bg-poster.jpg"
        loop
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover  contrast-110 brightness-95"
      >
        <source src="/bg-video.webm" type="video/webm" />
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}