"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

import Navbar from "./Navbar";

import HeroCards from "./HeroCards";

const Hero = () => {
  const heroContentRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const elements = gsap.utils.toArray<HTMLElement>(".hero-scroll-text");

      gsap.fromTo(
        elements,
        {
          opacity: 0,
          y: 16,
          scale: 0.9,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.12,
        },
      );
    }, heroContentRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-[#F7F6F4] p-2.5">
 
      <section
        className="relative flex min-h-screen flex-col items-center overflow-hidden rounded-[28px] bg-cover bg-center text-center"
       
      >
             <Navbar/>
        {/* Dark overlay */}
        <div className="absolute inset-0 z-0 bg-black" />

        {/* Optional gradient overlay for better readability */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />

        <div
          ref={heroContentRef}
          className="relative z-10 flex flex-col items-center py-16 text-center"
        >
          <div className="mt-20">
            <h1 className="hero-scroll-text text-center text-[60px] font-medium leading-[1.12] tracking-tighter text-[#F8F7F4]">
              Your workplace knowledge.
              <br />
              <span className="bg-gradient-to-r from-[#D8C7FF] via-[#F3B6D2] to-[#FFB38A] bg-clip-text text-transparent">
                One simple conversation.
              </span>
            </h1>

            <p className="hero-scroll-text mx-auto mt-6 max-w-[460px] text-[16px] leading-6 text-[#F8F7F4]/80">
              Find answers across company policies, HR documents, reports, and
              internal files — just by asking.
            </p>

            <div className="hero-scroll-text mt-7 flex justify-center gap-4">
              {/* Secondary Button */}
              <button className="rounded-full border border-white/20 bg-white/10 px-6 py-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/20">
                View Demo
              </button>

              {/* Primary Button */}
              <button className="group flex items-center gap-3 rounded-full bg-[#E7D7FF] py-1.5 pl-5 pr-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[#211A2B] transition-all duration-300 hover:scale-105 hover:bg-[#F0E4FF]">
                <span>Get Started</span>

                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#211A2B] text-white transition-transform duration-300 group-hover:rotate-45">
                  ↗
                </span>
              </button>
            </div>
          </div>
        </div>

        <HeroCards />
      </section>
    </div>
  );
};

export default Hero;
