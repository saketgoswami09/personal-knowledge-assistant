import Hero from "./components/landing/Hero";
import About from "./components/About";

export default function Home() {
  return (
    <>
      <section className="relative min-h-screen overflow-hidden text-white">
        <Hero />
      </section>
      <About />
    </>
  );
}