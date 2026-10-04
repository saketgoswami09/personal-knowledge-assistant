"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Navbar from "./Navbar";
import Link from "next/link";
import VideoBackground from "../VideoBackground";
import BottomFade from "../BottomFade";
import Grain from "../Grain";

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Intro animation
      gsap.fromTo(
        ".hero-title-line",
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: "power3.out" }
      );
      
      gsap.fromTo(
        ".hero-subtitle",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 0.4, ease: "power3.out" }
      );

      gsap.fromTo(
        ".hero-buttons",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 0.6, ease: "power3.out" }
      );

      // Parallax effect for the text block as you scroll down
      gsap.to(".hero-content", {
        y: 150,
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <VideoBackground />
      <Grain opacity={0.25} />
      <BottomFade />
      <div ref={containerRef} className="min-h-[85vh] flex flex-col relative z-10">
        <Navbar />

        <main className="flex-grow flex flex-col items-center px-4 relative">
          <div className="hero-content max-w-4xl mx-auto w-full relative pt-32 md:pt-40 pb-24">
            
            {/* Corner Brackets */}
            

            <div className="text-center sm:px-12 z-10 relative">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-normal tracking-tight leading-[1.08] text-white text-balance flex flex-col items-center justify-center">
                <span className="hero-title-line font-sans font-light tracking-[-0.03em] block">Chat with the</span>
                <span className="hero-title-line font-serif font-normal tracking-[-0.01em] text-[1.08em] italic block mt-2">
                  Things You Know
                </span>
              </h1>

              <p className="hero-subtitle mx-auto mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-white/70 font-normal text-balance">
                Upload your notes, docs and PDFs, then ask questions in plain language. Conscious finds the answer and shows you where it came from.
              </p>

              <div className="hero-buttons mt-10 flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/sign-up"
                  className="rounded-full bg-white px-7 py-3.5 text-[15px] font-medium tracking-tight font-sans text-black transition-all hover:bg-gray-200 hover:scale-105"
                >
                  Get started free
                </Link>
                <Link
                  href="#features"
                  className="rounded-full border border-white/50 bg-white/10 px-7 py-3.5 text-[15px] font-medium tracking-tight font-sans text-white backdrop-blur-md transition-all hover:bg-white/20"
                >
                  View features
                </Link>
              </div>
            </div>
          </div>
          
          {/* Bottom Strip */}
          
        </main>
      </div>
    </>
  );
};

export default Hero;
