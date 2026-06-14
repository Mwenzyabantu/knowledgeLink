import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoHeightTextarea } from "@/hooks/use-auto-height-textarea";

interface SimpleInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
}

export function SimpleInput({ onSend, placeholder = "Type your message..." }: SimpleInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useAutoHeightTextarea(message, 50);

  const handleSubmit = () => {
    if (!message.trim()) return;
    onSend(message);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="py-3 border-t">
      <div
        className={`border-b-2 transition-colors ${
          isFocused ? "border-primary" : "border-border"
        }`}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="flex-1 min-h-[50px] resize-none bg-transparent border-0 focus:outline-none text-sm p-0 placeholder:text-muted-foreground"
            style={{ overflow: 'hidden' }}
            data-testid="input-message"
          />
          <Button
            onClick={handleSubmit}
            disabled={!message.trim()}
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            data-testid="button-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
