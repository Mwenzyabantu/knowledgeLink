import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Sparkles, RefreshCw, RotateCcw } from "lucide-react";
import { generateChatResponse } from "@/lib/services/supabase";
import { cn } from "@/lib/utils";
import { useAutoHeightTextarea } from "@/hooks/use-auto-height-textarea";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ExtractedPreferences {
  preferredComplexity?: string;
  preferredApproach?: string;
  preferredTools?: string[];
  topicLean?: string;
  additionalNotes?: string;
  confidenceLevel: number;
  isReadyToGenerate: boolean;
}

interface ProjectPreferenceChatProps {
  conceptTitle: string;
  conceptCategory: string;
  onGenerate: (preferences: ExtractedPreferences) => void;
  onCancel: () => void;
}

export function ProjectPreferenceChat({
  conceptTitle,
  conceptCategory,
  onGenerate,
  onCancel,
}: ProjectPreferenceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  const [latestPrefs, setLatestPrefs] = useState<ExtractedPreferences>({
    confidenceLevel: 0,
    isReadyToGenerate: false,
  });
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useAutoHeightTextarea(input, 36);

  useEffect(() => {
    startConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = async () => {
    setIsLoading(true);
    try {
      const reply = await generateChatResponse(
        `I want to explore a project about ${conceptTitle}. What complexity should I aim for?`,
        []
      );
      setMessages([{ role: "assistant", content: reply }]);
      setLatestPrefs({ confidenceLevel: 0, isReadyToGenerate: false });
      setIsReadyToGenerate(false);
    } catch (e) {
      setMessages([{
        role: "assistant",
        content: "What would you like to explore differently in this new project? Tell me about the complexity you're after or any specific angle you want to take.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const doSendMessage = async (trimmed: string, updatedMessages: Message[]) => {
    setIsLoading(true);
    setLastFailedInput(null);
    try {
      const reply = await generateChatResponse(trimmed, updatedMessages);
      setMessages([...updatedMessages, { role: "assistant", content: reply }]);
      setLatestPrefs({ confidenceLevel: 0.5, isReadyToGenerate: true });
      setIsReadyToGenerate(true);
    } catch {
      setLastFailedInput(trimmed);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    const updatedMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(updatedMessages);
    setInput("");
    await doSendMessage(trimmed, updatedMessages);
  };

  const retryMessage = () => {
    if (!lastFailedInput || isLoading) return;
    const updatedMessages: Message[] = [...messages, { role: "user", content: lastFailedInput }];
    setMessages(updatedMessages);
    doSendMessage(lastFailedInput, updatedMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const complexityLabel = (v?: string) => {
    if (!v) return null;
    return { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" }[v] ?? v;
  };

  const approachLabel = (v?: string) => {
    if (!v) return null;
    return {
      simulation: "Simulation",
      code: "Code-focused",
      theory: "Theory",
      mixed: "Mixed approach",
    }[v] ?? v;
  };

  const hasPreviewPrefs =
    latestPrefs.preferredComplexity ||
    latestPrefs.preferredApproach ||
    (latestPrefs.preferredTools && latestPrefs.preferredTools.length > 0) ||
    latestPrefs.topicLean;

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
        <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Tell me what you want differently</p>
          <p className="text-xs text-muted-foreground truncate">
            Chat briefly — then hit generate when ready
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          data-testid="button-cancel-preference-chat"
          className="text-xs text-muted-foreground"
        >
          Cancel
        </Button>
      </div>

      <div className="flex flex-col gap-3 p-4 max-h-64 overflow-y-auto">
        {messages.length === 0 && isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-md px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-md px-3 py-2 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
              data-testid={`msg-${msg.role}-${i}`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-md px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        {lastFailedInput && !isLoading && (
          <div className="flex justify-end">
            <button
              onClick={retryMessage}
              className="flex items-center gap-1.5 text-xs text-destructive border border-destructive/30 rounded-full px-3 py-1 hover:bg-destructive/10 transition-colors"
              data-testid="button-retry-preference"
            >
              <RotateCcw className="h-3 w-3" />
              Request failed — retry
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {hasPreviewPrefs && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {latestPrefs.preferredComplexity && (
            <span className="text-xs bg-accent/50 text-foreground px-2 py-0.5 rounded-sm border border-border">
              {complexityLabel(latestPrefs.preferredComplexity)}
            </span>
          )}
          {latestPrefs.preferredApproach && (
            <span className="text-xs bg-accent/50 text-foreground px-2 py-0.5 rounded-sm border border-border">
              {approachLabel(latestPrefs.preferredApproach)}
            </span>
          )}
          {latestPrefs.preferredTools?.map((t, i) => (
            <span key={i} className="text-xs bg-accent/50 text-foreground px-2 py-0.5 rounded-sm border border-border">
              {t}
            </span>
          ))}
          {latestPrefs.topicLean && (
            <span className="text-xs bg-accent/50 text-foreground px-2 py-0.5 rounded-sm border border-border">
              {latestPrefs.topicLean}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2 items-end px-4 pb-3 border-t pt-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your reply..."
          className="flex-1 resize-none bg-transparent border-0 text-sm placeholder:text-muted-foreground focus:outline-none py-1.5"
          data-testid="input-preference-chat"
          rows={1}
          disabled={isLoading}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          data-testid="button-send-preference"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-4 pb-4">
        <Button
          size="sm"
          onClick={() => onGenerate(latestPrefs)}
          data-testid="button-generate-with-preferences"
          className="w-full"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          {isReadyToGenerate ? "Generate This Project" : "Generate With These Preferences"}
        </Button>
      </div>
    </div>
  );
}
