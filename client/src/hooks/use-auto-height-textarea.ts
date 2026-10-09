import { useEffect, useRef } from 'react';

export function useAutoHeightTextarea(value: string, minHeight: number = 60) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set the height based on scrollHeight
    const newHeight = Math.max(textarea.scrollHeight, minHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value, minHeight]);

  return textareaRef;
}
