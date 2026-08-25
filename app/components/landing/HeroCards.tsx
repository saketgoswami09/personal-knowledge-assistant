"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import Image from "next/image";

import card1 from "./card-1.avif";
import card2 from "./card-2.avif";
import card3 from "./card-3.avif";
import card4 from "./card-4.avif";
import card5 from "./card-5.avif";
import card6 from "./card-6.avif";
import card7 from "./card-7.avif";
import card8 from "./card-8.avif";

import { AsciiParticleHero, JUPITER_ART } from "./AsciiParticleHero";

const cards = [
  card1,
  card2,
  card3,
  card4,
  card5,
  card6,
  card7,
  card8,
];

const positions = [
  "",
  "is-first",
  "is-second",
  "is-third",
  "is-fourth",
  "is-fifth",
  "is-six",
  "is-seven",
];

const groups = [
  {
    name: "first",
    cards: [
      cards[0],
      cards[2],
      cards[5],
      cards[0],
      cards[2],
      cards[5],
      cards[0],
      cards[2],
    ],
  },
  {
    name: "second",
    cards: [
      cards[0],
      cards[3],
      cards[6],
      cards[0],
      cards[3],
      cards[6],
      cards[0],
      cards[3],
    ],
  },
  {
    name: "third",
    cards: [
      cards[7],
      cards[1],
      cards[4],
      cards[7],
      cards[1],
      cards[4],
      cards[7],
      cards[1],
    ],
  },
];

const HeroCards = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const wrap =
        rootRef.current?.querySelector<HTMLElement>(".hero-3d-wrap");

      const wheelGroups =
        gsap.utils.toArray<HTMLElement>(".hero-3d-group");

      if (!wrap) return;

      // Entrance animation
      gsap.fromTo(
        wrap,
        {
          y: 80,
          scale: 0.92,
        },
        {
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: "power3.out",
        }
      );

      // Infinite rotation
      wheelGroups.forEach((group) => {
        gsap.to(group, {
          rotationZ: "-=360",
          duration: 40,
          repeat: -1,
          ease: "none",
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="hero-3d relative w-full h-[520px]">
      <div className="absolute inset-0 -z-10">
        <AsciiParticleHero art={JUPITER_ART} />
      </div>
      <div className="hero-3d-wrap pointer-events-none">
        {groups.map((group) => (
          <div
            key={group.name}
            className={`hero-3d-group ${group.name}`}
          >
            {group.cards.map((image, index) => (
              <div
                key={`${group.name}-${index}`}
                className={`hero-img3d ${positions[index]} pointer-events-auto`}
              >
                <div className="hero-image-wrapper">
                  <Image
                    src={image}
                    alt={`Card ${index + 1}`}
                    fill
                    sizes="128px"
                    className="hero-image3d"
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroCards;