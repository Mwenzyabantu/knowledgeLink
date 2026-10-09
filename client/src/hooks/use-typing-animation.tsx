import { useState, useEffect } from "react";

interface UseTypingAnimationProps {
  text: string;
  enabled?: boolean;
  speed?: number;
}

export function useTypingAnimation({ text, enabled = true, speed = 25 }: UseTypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    if (!text) {
      setDisplayedText("");
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayedText("");
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, speed);

    return () => {
      clearInterval(interval);
    };
  }, [text, enabled, speed]);

  return { displayedText, isTyping };
}
