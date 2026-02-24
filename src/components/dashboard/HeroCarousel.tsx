import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useHeroData } from "./slides/useHeroData";
import NetBalanceSlide from "./slides/NetBalanceSlide";
import AgingDebtSlide from "./slides/AgingDebtSlide";
import ContributionSlide from "./slides/ContributionSlide";

const GRADIENTS: Record<string, { from: string; to: string }> = {
  "solid-orange": { from: "hsl(18,89%,47%)", to: "hsl(18,89%,47%)" },
  "orange-red": { from: "hsl(15,90%,55%)", to: "hsl(0,85%,50%)" },
  "blue-purple": { from: "hsl(220,80%,55%)", to: "hsl(270,70%,55%)" },
  "green-teal": { from: "hsl(150,60%,45%)", to: "hsl(180,70%,45%)" },
  "pink-orange": { from: "hsl(330,80%,60%)", to: "hsl(25,90%,55%)" },
  "gray-black": { from: "hsl(0,0%,40%)", to: "hsl(0,0%,15%)" },
};

export default function HeroCarousel() {
  const { currentGroup } = useApp();
  const navigate = useNavigate();
  const heroData = useHeroData();

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [activeIndex, setActiveIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!currentGroup) return null;

  const gradient = GRADIENTS[currentGroup.banner_gradient] ?? GRADIENTS["orange-red"];
  const bgStyle = {
    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
  };

  // Build slides array
  const slides: React.ReactNode[] = [
    <NetBalanceSlide
      key="net"
      netBalance={heroData.netBalance}
      totalOwedToYou={heroData.totalOwedToYou}
      totalYouOwe={heroData.totalYouOwe}
      debtsYouOwe={heroData.debtsYouOwe}
    />,
  ];

  if (heroData.showAgingSlide) {
    slides.push(
      <AgingDebtSlide key="aging" agingDebts={heroData.agingDebts} />
    );
  }

  if (heroData.showContributionSlide) {
    slides.push(
      <ContributionSlide
        key="contribution"
        contributionPct={heroData.contributionPct}
        totalUserPaid={heroData.totalUserPaid}
        totalGroupExpenses={heroData.totalGroupExpenses}
      />
    );
  }

  const showDots = slides.length > 1;

  return (
    <div className="relative rounded-b-2xl overflow-hidden" style={bgStyle}>
      {/* Nav bar with darker tint */}
      <div className="relative z-10">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentGroup.emoji}</span>
            <h1 className="text-lg font-bold text-white">{currentGroup.name}</h1>
          </div>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full"
            aria-label="Group settings"
            onClick={() => navigate(`/groups/${currentGroup.id}/settings`)}
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Carousel viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0">
              {slide}
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {showDots && (
        <div className="flex justify-center gap-1.5 pb-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`rounded-full transition-all ${
                i === activeIndex
                  ? "w-6 h-2 bg-white"
                  : "w-2 h-2 bg-white/50"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
