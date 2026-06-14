import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAutoHeightTextarea } from "@/hooks/use-auto-height-textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useAutoHeightTextarea(message, 60);

  const handleSubmit = () => {
    if (!message.trim() || disabled) return;
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
    <div className="flex gap-2 items-end">
      <Textarea
        ref={textareaRef}
        placeholder="Ask about real-world applications, request pseudocode, or explore connections..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        className="resize-none min-h-[60px]"
        disabled={disabled}
        data-testid="input-chat-message"
        style={{ overflow: 'hidden' }}
      />
      <Button
        onClick={handleSubmit}
        disabled={!message.trim() || disabled}
        size="icon"
        className="h-[60px] w-[60px]"
        data-testid="button-send-message"
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
}
