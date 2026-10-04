"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Brain, Zap } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const About = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const revealElements = gsap.utils.toArray<HTMLElement>(".about-reveal");

      revealElements.forEach((element) => {
        gsap.fromTo(
          element,
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

            scrollTrigger: {
              trigger: element,
              start: "top 85%",
              once: true,
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="bg-[#14121f] px-6 py-24 text-white"
    >
      
      <div className="mx-auto max-w-7xl">

        {/* Section heading */}
        <div className="flex flex-col items-center text-center">

          {/* Tag */}
          <div className="about-reveal flex items-center gap-3 text-sm uppercase tracking-[0.18em]">
            <span className="h-1.5 w-1.5 bg-white" />
            <span>Why Conscious</span>
          </div>

          {/* Heading */}
          <h2 className="about-reveal mt-10 max-w-4xl text-[48px] font-medium leading-[1.1] tracking-[-0.04em] md:text-[56px]">
            Your personal AI brain,
            <br />
            designed to make research{" "}
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-400 align-middle text-2xl text-black">
              <Brain size={24} />
            </span>{" "}
            faster
            <br />
            <span className="text-white/50">
              and{" "}
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-lime-300 align-middle text-2xl text-black">
                <Zap size={24} fill="currentColor" />
              </span>{" "}
              infinitely smarter
            </span>
          </h2>

        </div>

        {/* Cards */}
        <div className="mt-20 grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* 120+ card */}
          <div className="about-reveal relative min-h-[305px] overflow-hidden rounded-[24px] bg-sky-500 p-5">

            <div className="relative z-10">
              <div className="text-2xl font-semibold text-white">
                Context
              </div>
            </div>

            <div className="absolute inset-x-5 bottom-5 rounded-[16px] bg-white/20 backdrop-blur-md p-5 text-white">

              <div className="text-[48px] font-normal leading-none tracking-tight">
                Instant
              </div>

              <p className="mt-4 max-w-sm text-[16px] leading-6">
                Answers from your own notes. Faster information retrieval across your entire library.
              </p>

            </div>
          </div>

          {/* 100% card */}
          <div className="about-reveal min-h-[305px] rounded-[24px] bg-white/5 p-5">

            <p className="text-[16px]">
              Direct Citations
            </p>

            <div className="mt-5 text-[56px] leading-none">
              100%
            </div>

            <div className="mt-14 flex -space-x-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-10 w-10 rounded-full border-2 border-[#14121f] bg-neutral-500"
                />
              ))}
            </div>

            <p className="mt-5 max-w-sm text-[15px] leading-6">
              “Every answer provides a precise citation, so you never have to guess where the information came from.”
            </p>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* 520k */}
            <div className="about-reveal min-h-[190px] rounded-[24px] bg-[#d6fd70] p-5 text-black">

              <p className="text-[16px]">
                File Size Limit
              </p>

              <div className="mt-5 text-[48px] leading-none">
                Up to 50MB
              </div>

              <p className="mt-8 max-w-sm text-[15px] leading-6">
                Upload and digest large PDFs, Word docs, and text files.
              </p>

            </div>

            {/* 20+ */}
            <div className="about-reveal flex min-h-[100px] items-center justify-between rounded-[24px] bg-white/5 px-5 text-white">

              <span className="text-[16px]">
                Formats Supported
              </span>

              <span className="text-[28px] leading-none text-right">
                PDF, TXT, MD
              </span>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default About;