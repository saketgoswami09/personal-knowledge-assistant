"use client";

import VideoBackground from "../VideoBackground";
import Grain from "../Grain";

const GITHUB_URL = "https://github.com/saketgoswami09";
const LINKEDIN_URL = "https://www.linkedin.com/in/saket-giri-4408992a2"; // TODO: confirm linkedin
const CONTACT_EMAIL = "saketgirigoswami4141@gmail.com"; // TODO: confirm email

const Footer = () => {
  return (
    <footer className="relative flex flex-col justify-between overflow-hidden bg-[#14121f] text-white rounded-t-[2.5rem] md:rounded-t-[4rem] z-20 -mt-12 shadow-2xl">
      {/* Background */}
      <VideoBackground />
      {/* Vibrant Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-600/80 via-red-500/60 to-purple-800/80 mix-blend-color pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#14121f]/80 via-transparent to-transparent pointer-events-none" />
      <Grain opacity={0.35} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 md:px-10 flex-grow flex flex-col justify-between pt-24">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Links */}
          <div className="flex flex-col gap-2 text-5xl md:text-7xl font-medium tracking-tight">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors inline-block w-fit">
              GitHub
            </a>
            {LINKEDIN_URL && (
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors inline-block w-fit">
                LinkedIn
              </a>
            )}
            {CONTACT_EMAIL && (
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white/70 transition-colors inline-block w-fit">
                Send an email
              </a>
            )}
          </div>

          {/* Contact */}
          <div className="flex flex-col justify-start md:items-end">
            <p className="text-lg md:text-xl text-white/90 max-w-sm md:text-right mb-8">
              Let's connect and build something amazing together. Reach out for collaborations or just a friendly chat.
            </p>
          </div>
        </div>

        {/* Big Wordmark */}
        <div className="w-full mt-32 mb-8 flex justify-center items-end overflow-hidden">
          <h1 className="text-[16vw] leading-[0.75] font-medium tracking-[-0.06em] text-center text-white">
            Conscious
          </h1>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-6 md:px-10 py-6 border-t border-white/20 text-sm text-white/70">
        <p>Copyright &copy; 2026 Conscious</p>
        <div className="flex gap-6 mt-4 sm:mt-0">
          <a href="#top" className="hover:text-white transition-colors">Back to top</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
