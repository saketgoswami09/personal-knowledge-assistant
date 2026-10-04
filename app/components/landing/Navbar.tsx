"use client";

import { SignInButton, SignUpButton, UserButton, Show } from "@clerk/nextjs";
import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="relative z-50 mx-auto flex w-full items-center justify-between px-6 md:px-10 py-5">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-[17px] font-semibold tracking-tight text-white">Conscious</span>
      </div>

      {/* Links (Hidden on Mobile) */}
      <div className="hidden md:flex items-center gap-8">
        <Link href="#features" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
          Features
        </Link>
        <Link href="#" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
          How it works
        </Link>
        <Link href="#" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
          Pricing
        </Link>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-4">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="hidden sm:block text-sm font-medium text-white/70 hover:text-white transition-colors">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-full bg-white px-5 py-2.5 text-sm font-medium tracking-tight font-sans text-black hover:bg-gray-200 transition-colors">
              Create a free account &rarr;
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/chat"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium tracking-tight font-sans text-black hover:bg-gray-200 transition-colors"
          >
            Go to App &rarr;
          </Link>
          <div className="flex items-center justify-center">
            <UserButton />
          </div>
        </Show>
      </div>
    </nav>
  );
};

export default Navbar;
