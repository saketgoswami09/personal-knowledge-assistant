"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

const Navbar = () => {
  const navRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".nav-animate",
        {
          opacity: 0,
          y: -12,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
        },
      );
    }, navRef);

    return () => ctx.revert();
  }, []);

  return (
    <nav
      ref={navRef}
      className="relative z-50 mx-auto flex w-full max-w-[950px] items-center justify-between px-4 py-5 font-geist-mono text-[16px] text-white"
    >
      {/* Logo */}
      <div className="nav-animate flex items-center gap-2 font-normal">
        <span>Conscious</span>
      </div>

      {/* Links */}
      <div className="flex items-center gap-7 uppercase tracking-[0.12em]">
        <a className="nav-animate" href="#">
          Home
        </a>

        <a className="nav-animate" href="#">
          FEATURES
        </a>

        <a className="nav-animate" href="#">
          ABOUT
        </a>

        <a className="nav-animate flex items-center gap-2" href="#">
          CONTACT
        </a>
      </div>

      {/* CTA */}
      <button className="nav-animate rounded-full bg-[#d6fd70] px-5 py-3 text-xs font-normal uppercase tracking-[0.12em] text-black">
        GET STARTED
      </button>
    </nav>
  );
};

export default Navbar;
