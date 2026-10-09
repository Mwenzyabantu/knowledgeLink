import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { TrendingUp } from "lucide-react";

interface Trend {
  id: number;
  title: string;
}

export function RotatingTrendHeadline() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [, setLocation] = useLocation();

  // Fetch trends from API
  const { data: trends = [], isLoading } = useQuery<Trend[]>({
    queryKey: ["/api/trends"],
  });

  useEffect(() => {
    if (trends.length === 0) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % trends.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [trends.length]);

  const currentTrend = trends[currentIndex];

  const handleClick = () => {
    setLocation(`/trends/${currentTrend.id}`);
  };

  if (isLoading || trends.length === 0) {
    return (
      <div
        className="border-l-2 border-primary pl-6 py-4 hover-elevate active-elevate-2 transition-all duration-300 rounded-r-lg"
        data-testid="rotating-trend-headline"
      >
        <div className="flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Latest Trend</p>
            <h3 className="text-base font-semibold leading-snug text-muted-foreground">
              Loading trends...
            </h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="border-l-2 border-primary pl-6 py-4 cursor-pointer hover-elevate active-elevate-2 transition-all duration-300 rounded-r-lg"
      data-testid="rotating-trend-headline"
    >
      <div className="flex items-start gap-3">
        <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Latest Trend</p>
          <h3
            className={`text-base font-semibold leading-snug transition-opacity duration-300 ${
              isTransitioning ? "opacity-0" : "opacity-100"
            }`}
          >
            {currentTrend?.title || "No trends available"}
          </h3>
        </div>
      </div>
      <div className="mt-2 flex gap-1">
        {trends.map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "bg-primary w-4"
                : "bg-muted w-1"
            }`}
            data-testid={`trend-indicator-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
