"use client";

/**
 * components/chat/HomeScreen.tsx
 *
 * The landing screen shown when no messages exist yet.
 * Contains the hero, onboarding flow, feature pills, suggestion grid, and the floating input.
 */

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { ChevronRight, ChevronLeft, Sparkles, BookOpen, MessageSquare, ArrowRight } from "lucide-react";
import { SuggestionGrid } from "./SuggestionGrid";
import { FloatingInput } from "./FloatingInput";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
}

const GREETINGS = [
  "Hey, {name} 👋",
  "Welcome back, {name}!",
  "Namaste, {name} 🙏",
  "Vanakkam, {name} 🙏",
  "Hola, {name} 👋",
  "Amigo, {name} 😎",
  "Good to see you, {name}!",
];

export function HomeScreen({ value, onChange, onSubmit, disabled }: Props) {
  const { user, isLoaded } = useUser();
  const [greetingText, setGreetingText] = useState("Good to see you");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);

  // Pick a random greeting style on mount to avoid hydration warnings
  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * GREETINGS.length);
    setGreetingText(GREETINGS[randomIdx]);
  }, []);

  // Check onboarding status in localStorage, user-scoped by their Clerk user ID
  useEffect(() => {
    if (isLoaded && user?.id) {
      const completed = localStorage.getItem(`conscious_onboarding_completed_${user.id}`);
      setShowOnboarding(completed !== "true");
      setOnboardingLoaded(true);
    }
  }, [isLoaded, user?.id]);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCompleteOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteOnboarding = () => {
    if (user?.id) {
      localStorage.setItem(`conscious_onboarding_completed_${user.id}`, "true");
      setShowOnboarding(false);
    }
  };

  const handleSuggestionSelect = (prompt: string) => {
    onChange(prompt);
    // Snap-action: trigger submit automatically after setting input to initiate the chat flow immediately
    setTimeout(() => {
      const mockEvent = {
        preventDefault: () => {},
      } as React.FormEvent;
      onSubmit(mockEvent);
    }, 100);
  };

  const nameFallback = user?.firstName || "there";
  const dynamicGreeting = greetingText.replace("{name}", nameFallback);

  // Render a skeleton loader while Clerk loads
  if (!isLoaded || (user?.id && !onboardingLoaded)) {
    return (
      <div className="flex items-center justify-center flex-1 h-screen bg-[#F7F6F4]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
          <span className="text-sm font-medium text-gray-400">Loading assistant...</span>
        </div>
      </div>
    );
  }
  // ── Onboarding Experience Flow ──
  if (showOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 px-6 py-12 bg-[#F7F6F4] overflow-y-auto w-full animate-fadeIn">
        <div className="w-full max-w-lg bg-white border border-gray-100 rounded-[28px] p-8 shadow-xl shadow-violet-100/50 relative overflow-hidden transition-all duration-300">
          
          {/* Subtle background gradient glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100/40 rounded-full blur-3xl -z-10" />

          {/* Stepper progress indicator */}
          <div className="flex justify-between items-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 font-geist-mono">
              Onboarding • Step {currentStep} of 3
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === currentStep ? "w-6 bg-violet-600" : "w-1.5 bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step Contents */}
          <div className="min-h-[220px] flex flex-col justify-between">
            {currentStep === 1 && (
              <div className="transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
                  <Sparkles className="w-6 h-6 text-violet-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Conscious 👋</h2>
                <p className="text-gray-500 leading-relaxed text-sm">
                  I am your private AI knowledge assistant. I help you consolidate and turn your local files, resumes, and study materials into instant, verifiable answers.
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
                  <BookOpen className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Add Your Knowledge 📚</h2>
                <p className="text-gray-500 leading-relaxed text-sm">
                  Start by uploading your PDF files under the <strong>Upload</strong> tab. We chunk and translate your text into safe, semantic vector embeddings inside your private database.
                </p>
              </div>
            )}

            {currentStep === 3 && (
              <div className="transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Ask Anything 💬</h2>
                <p className="text-gray-500 leading-relaxed text-sm">
                  Ask simple or complex queries about your documents. The assistant retrieves exact context matches to answer you, presenting direct quotes and sources alongside its response.
                </p>
              </div>
            )}

            {/* Stepper Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={handleCompleteOnboarding}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer bg-transparent border-none p-0"
              >
                Skip
              </button>
              
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-violet-600 text-xs font-semibold text-white hover:bg-violet-700 transition-all cursor-pointer"
                >
                  {currentStep === 3 ? "Get Started" : "Next"}
                  {currentStep !== 3 && <ChevronRight className="w-3.5 h-3.5" />}
                  {currentStep === 3 && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-0 px-6 pb-10 overflow-y-auto">
      {/* ── Hero & Personalized Greetings ── */}
      <div
        className="flex flex-col items-center text-center max-w-3xl w-full"
        style={{ marginBottom: "30px", paddingTop: "80px" }}
      >
        {/* Animated premium logo mark */}
        <div className="relative flex items-center justify-center w-14 h-14 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 via-gray-700 to-gray-950 z-10 shadow-lg shadow-violet-100" />
          <div
            className="absolute w-[3.5rem] h-[3.5rem] rounded-full border border-violet-400/30 animate-spin"
            style={{ animationDuration: "8s" }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 -top-[3.5px] w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2.5 animate-fadeIn">
          {dynamicGreeting}
        </h1>
        <p className="text-xs font-medium text-violet-500/85 mb-8 tracking-wider font-geist-mono uppercase animate-fadeIn">
          What would you like to explore today?
        </p>

        {/* Dynamic click-to-submit suggestion grid */}
        <SuggestionGrid onSelect={handleSuggestionSelect} />
      </div>

      {/* ── Floating Query Input ── */}
      <div className="w-full max-w-3xl animate-fadeIn" style={{ marginTop: "45px" }}>
        <FloatingInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          disabled={disabled}
          placeholder="Ask your knowledge base anything…"
        />
      </div>
    </div>
  );
}
