import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { useTypingAnimation } from "@/hooks/use-typing-animation";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isTyping?: boolean;
}

export function ChatMessage({ role, content, timestamp, isTyping = false }: ChatMessageProps) {
  const isUser = role === "user";
  const shouldAnimate = !isUser && isTyping;
  
  const { displayedText } = useTypingAnimation({
    text: content,
    enabled: shouldAnimate,
    speed: 25,
  });

  const displayContent = shouldAnimate ? displayedText : content;

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      data-testid={`message-${role}`}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-muted"}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-message-content">
            {displayContent}
          </p>
        </div>
        <span className="text-xs text-muted-foreground px-2" data-testid="text-message-timestamp">
          {timestamp}
        </span>
      </div>
    </div>
  );
}
