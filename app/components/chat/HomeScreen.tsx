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

const ROBOT_ASCII = `      .---.
     |[o_o]|
     |:_ _:|
    //   \\\\\\
   (|     |)
  /'\\_   _/\\'
  \\___)=(___/`;

const DOCS_ASCII = `      .--------.
     /  DATA  /|
    /  INFO  / |
   /________/  |
   |  ====  |  |
   |  ====  | /
   |________|/`;

const QUERY_ASCII = `       .-'''-.
      /   _   \\\\
     |  ( ? )  |
      \\\\   ~   /
       '-...-'`;

function TerminalView({ step }: { step: number }) {
  const [lines, setLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [typedText, setTypedText] = useState("");

  const stepsData = [
    {
      ascii: ROBOT_ASCII,
      color: "text-violet-400/90",
      lines: [
        "booting up brain...",
        "loading assistant...",
        "ready_"
      ]
    },
    {
      ascii: DOCS_ASCII,
      color: "text-emerald-400/90",
      lines: [
        "cat knowledge_base.conf",
        "Feed me knowledge.",
        "Not pizza. I run on documents."
      ]
    },
    {
      ascii: QUERY_ASCII,
      color: "text-violet-400/90",
      lines: [
        "query --mode psychic",
        "Ask me anything.",
        "Well... anything you've actually told me.",
        "I'm smart, but psychic is still in beta."
      ]
    }
  ];

  const currentStepData = stepsData[step - 1];

  useEffect(() => {
    setLines([]);
    setCurrentLineIndex(0);
    setTypedText("");
  }, [step]);

  useEffect(() => {
    if (!currentStepData) return;
    const targetLines = currentStepData.lines;
    if (currentLineIndex >= targetLines.length) return;

    const currentTargetLine = targetLines[currentLineIndex];
    const isCommand = step > 1 && currentLineIndex === 0;

    if (isCommand) {
      let charIdx = 0;
      setTypedText("$ ");
      const interval = setInterval(() => {
        setTypedText((prev) => prev + currentTargetLine[charIdx]);
        charIdx++;
        if (charIdx >= currentTargetLine.length) {
          clearInterval(interval);
          setTimeout(() => {
            setLines((prev) => [...prev, "$ " + currentTargetLine]);
            setTypedText("");
            setCurrentLineIndex((prev) => prev + 1);
          }, 300);
        }
      }, 40);
      return () => clearInterval(interval);
    } else {
      const delay = step === 1 ? 400 : 500;
      const timeout = setTimeout(() => {
        const prefix = step === 1 ? "> " : "  ";
        setLines((prev) => [...prev, prefix + currentTargetLine]);
        setCurrentLineIndex((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [step, currentLineIndex, currentStepData]);

  return (
    <div className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-5 shadow-inner font-mono text-xs text-slate-300 relative overflow-hidden h-[180px] flex flex-col mb-6 animate-fadeIn">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-2.5 mb-3.5 select-none">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-[10px] text-neutral-500 tracking-wider">assistant@conscious: ~</span>
        <div className="w-10" />
      </div>

      {/* Terminal Content Grid */}
      <div className="flex flex-1 gap-5 items-center sm:items-start min-h-0">
        {/* Left Column: Compact ASCII Art */}
        <pre className={`hidden sm:block leading-none select-none ${currentStepData?.color} shrink-0 font-mono text-[10px] tracking-widest`}>
          {currentStepData?.ascii}
        </pre>

        {/* Right Column: Console lines */}
        <div className="flex-1 flex flex-col justify-start h-full font-mono text-slate-300 overflow-y-auto space-y-1 select-none pr-1">
          {lines.map((line, idx) => {
            const isCmd = line.startsWith("$ ");
            const isAlert = line.includes("> ready_");
            return (
              <div 
                key={idx} 
                className={
                  isCmd 
                    ? "text-neutral-400 font-medium" 
                    : isAlert 
                      ? "text-emerald-400 font-bold" 
                      : "text-slate-200"
                }
              >
                {line}
              </div>
            );
          })}
          
          {/* Active typing or next output line */}
          {currentLineIndex < currentStepData?.lines.length && (
            <div className={step > 1 && currentLineIndex === 0 ? "text-neutral-400 font-medium" : "text-slate-200"}>
              {typedText || (step === 1 ? "> " : "  ")}
              <span className="inline-block w-1.5 h-3.5 bg-violet-400 ml-1 animate-pulse" />
            </div>
          )}

          {/* Finished booting line cursor */}
          {currentLineIndex >= currentStepData?.lines.length && (
            <div>
              <span className="inline-block w-1.5 h-3.5 bg-violet-400 ml-1 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


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
        <div className="w-full max-w-xl bg-white border border-gray-100 rounded-[28px] p-8 shadow-xl shadow-violet-100/50 relative overflow-hidden transition-all duration-300">
          
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

          {/* Terminal experience visualizer */}
          <TerminalView step={currentStep} />

          {/* Step Contents */}
          <div className="min-h-[160px] flex flex-col justify-between">
            {currentStep === 1 && (
              <div className="transition-all duration-300 animate-fadeIn">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome, {nameFallback} 👋</h2>
                <div className="text-gray-500 leading-relaxed text-sm space-y-2">
                  <p className="font-medium text-gray-700">Don&apos;t worry, I know absolutely nothing about you yet.</p>
                  <p>Let&apos;s fix that. I am your private AI knowledge assistant, designed to turn your local files, notes, and study materials into instant, secure answers.</p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="transition-all duration-300 animate-fadeIn">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Add Your Knowledge 📚</h2>
                <div className="text-gray-500 leading-relaxed text-sm space-y-2">
                  <p className="font-medium text-violet-600">Feed me knowledge. Not pizza. I run on documents.</p>
                  <p>Start by uploading your files under the <strong className="text-gray-800">Upload</strong> tab. Your data is chunked, secured, and safely stored in your private database.</p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="transition-all duration-300 animate-fadeIn">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Ask Anything 💬</h2>
                <div className="text-gray-500 leading-relaxed text-sm space-y-2">
                  <p className="font-medium text-gray-700">Ask me anything.</p>
                  <p className="font-medium text-violet-600">Well... anything you&apos;ve actually told me. I&apos;m smart, but psychic is still in beta.</p>
                  <p>Query your knowledge base anytime. Your assistant scans exact context matches and outputs precise quotes alongside its response.</p>
                </div>
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
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 text-xs font-semibold text-white hover:bg-violet-700 transition-all cursor-pointer shadow-lg shadow-violet-100"
                >
                  {currentStep === 3 ? "Alright, let's do this" : "Next"}
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
