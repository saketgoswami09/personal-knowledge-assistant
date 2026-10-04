import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { StoreProvider } from "@/app/components/StoreProvider";
import SmoothScroll from "@/app/components/SmoothScroll";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Conscious — Your Personal Knowledge Assistant",
  description: "Chat with your documents and turn your knowledge into answers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full`}
      >
        <body className="min-h-full flex flex-col font-sans antialiased">
          <StoreProvider>
            <SmoothScroll>{children}</SmoothScroll>
          </StoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
