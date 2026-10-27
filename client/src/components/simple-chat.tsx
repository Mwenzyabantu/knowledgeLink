import { Bot, User } from "lucide-react";

interface SimpleChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function SimpleChatMessage({ role, content, timestamp }: SimpleChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className="py-4 border-b last:border-b-0" data-testid={`message-${role}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isUser ? (
            <User className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Bot className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-medium">
              {isUser ? "You" : "AI Companion"}
            </span>
            <span className="text-xs text-muted-foreground" data-testid="text-timestamp">
              {timestamp}
            </span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-content">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
