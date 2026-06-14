import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";

interface ScrollableTabsProps {
  children: React.ReactElement;
}

export function ScrollableTabs({ children }: ScrollableTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(5);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Get total number of tabs (children of TabsList)
  const tabsListChildren = React.Children.toArray(children.props.children);
  const totalTabs = tabsListChildren.length;
  const endIndex = startIndex + visibleCount;

  useEffect(() => {
    const calculateVisibleTabs = () => {
      if (!containerRef.current || !tabsListRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const tabWidth = 120; // approximate width per tab
      const arrowWidth = 40; // width for arrow buttons
      const availableWidth = containerWidth - arrowWidth * 2;
      const calculated = Math.floor(availableWidth / tabWidth);
      const newVisibleCount = Math.max(1, calculated);

      setVisibleCount(newVisibleCount);
      setShowLeftArrow(startIndex > 0);
      setShowRightArrow(endIndex < totalTabs);
    };

    calculateVisibleTabs();
    window.addEventListener("resize", calculateVisibleTabs);
    return () => window.removeEventListener("resize", calculateVisibleTabs);
  }, [startIndex, endIndex, totalTabs]);

  const handleArrow = (direction: "left" | "right") => {
    if (direction === "left" && startIndex > 0) {
      setStartIndex(startIndex - 1);
    } else if (direction === "right" && endIndex < totalTabs) {
      setStartIndex(startIndex + 1);
    }
  };

  // Get visible tabs
  const visibleTabs = tabsListChildren.slice(startIndex, endIndex);

  // Clone the TabsList with only visible tabs
  const modifiedTabsList = React.cloneElement(children, {
    ...children.props,
    children: visibleTabs,
  });

  return (
    <div ref={containerRef} className="relative flex items-center gap-0">
      {showLeftArrow && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 flex-shrink-0"
          onClick={() => handleArrow("left")}
          data-testid="button-scroll-tabs-left"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      <div ref={tabsListRef} className="flex-1 min-w-0">
        {modifiedTabsList}
      </div>

      {showRightArrow && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 flex-shrink-0"
          onClick={() => handleArrow("right")}
          data-testid="button-scroll-tabs-right"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
