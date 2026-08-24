"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { SignInButton, SignUpButton, UserButton, Show } from "@clerk/nextjs";

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
      <div className="flex items-center gap-5">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="nav-animate cursor-pointer uppercase tracking-[0.12em] hover:text-[#d6fd70] transition-colors">
              SIGN IN
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="nav-animate cursor-pointer rounded-full bg-[#d6fd70] px-5 py-3 text-xs font-normal uppercase tracking-[0.12em] text-black hover:bg-white hover:text-black transition-colors">
              GET STARTED
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <a
            href="/chat"
            className="nav-animate cursor-pointer rounded-full bg-[#d6fd70] px-5 py-3 text-xs font-normal uppercase tracking-[0.12em] text-black hover:bg-white hover:text-black transition-colors"
          >
            GO TO CHAT
          </a>
          <div className="nav-animate flex items-center justify-center">
            <UserButton />
          </div>
        </Show>
      </div>
    </nav>
  );
};

export default Navbar;
