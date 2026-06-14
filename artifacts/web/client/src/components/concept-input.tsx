import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Clock } from "lucide-react";
import { VoiceInput } from "./voice-input";
import { useDebounce } from "@/hooks/use-debounce";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { localStorage } from "@/lib/services/localStorage";
import { safeStorage } from "@/lib/safeStorage";
import { generate5WH } from "@/lib/services/supabase";
import { KnowledgeDetail } from "./knowledge-detail";
import { HistoryDialog } from "./history-dialog";
import { useAutoHeightTextarea } from "@/hooks/use-auto-height-textarea";
import { formatDistanceToNow } from "date-fns";
import type { Concept } from "@shared/schema";
import { useSidebar } from "@/components/ui/sidebar";

interface ConceptInputProps {
  onTypingChange?: (isTyping: boolean) => void;
}

export function ConceptInput({ onTypingChange }: ConceptInputProps) {
  const [concept, setConcept] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [inlinePrompt, setInlinePrompt] = useState("");
  const [dismissedPrompts, setDismissedPrompts] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [generatedConcept, setGeneratedConcept] = useState<Concept | null>(() => {
    try {
      const stored = safeStorage.getItem('generatedConcept');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recentTyping, setRecentTyping] = useState("");
  const textareaRef = useAutoHeightTextarea(concept, 48);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastConceptLengthRef = useRef(0);
  const autoFocusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const generatedConceptRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const autoFocusDisabledRef = useRef(false);

  // Get countdown duration from localStorage (default 3 seconds)
  const countdownDuration = (() => {
    try {
      const raw = safeStorage.getItem('inlinePromptCountdown');
      return raw ? parseInt(raw) : 3;
    } catch {
      return 3;
    }
  })();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { setOpen, isMobile, setOpenMobile } = useSidebar();

  const generatePromptMutation = useMutation({
    mutationFn: async ({ userInput }: { userInput: string; recent: string }) => {
      setIsAiReplying(true);
      // Static: no backend inline prompt; just return empty
      return { prompt: "" };
    },
    onSuccess: (data) => {
      if (data.prompt) {
        setInlinePrompt(data.prompt);
      }
      setIsAiReplying(false);
      setCountdown(null);
    },
    onError: () => {
      setIsAiReplying(false);
      setCountdown(null);
    },
  });

  const submitConceptMutation = useMutation({
    mutationFn: async (userInput: string) => {
      const fiveWH = await generate5WH(userInput);
      const conceptData = {
        ...fiveWH,
        originalInput: userInput,
        tags: [],
        isFavorite: false,
      };
      const concept = await localStorage.concepts.add(userInput);
      return concept;
    },
    onSuccess: (newConcept: Concept) => {
      queryClient.invalidateQueries({ queryKey: ["/api/concepts"] });
      setGeneratedConcept(newConcept);
      setConcept("");
      toast({
        title: "Concept created!",
        description: `"${newConcept.title}" has been added to your knowledge base.`,
      });
      setInlinePrompt("");
      setDismissedPrompts([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create concept. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    safeStorage.setItem('generatedConcept', JSON.stringify(generatedConcept));
  }, [generatedConcept]);

  // Scroll newly generated concept to top
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    if (generatedConcept && generatedConceptRef.current) {
      setTimeout(() => {
        generatedConceptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [generatedConcept?.id]);

  // Auto-focus textarea once on dashboard load, disabled on any user interaction
  useEffect(() => {
    isMountedRef.current = true;
    autoFocusDisabledRef.current = false;

    const disableAutoFocus = () => {
      autoFocusDisabledRef.current = true;
      if (autoFocusTimerRef.current) {
        clearTimeout(autoFocusTimerRef.current);
        autoFocusTimerRef.current = null;
      }
      // Remove all event listeners
      window.removeEventListener('scroll', disableAutoFocus);
      window.removeEventListener('mousedown', disableAutoFocus);
      window.removeEventListener('touchstart', disableAutoFocus);
      window.removeEventListener('keydown', disableAutoFocus);
      window.removeEventListener('wheel', disableAutoFocus);
    };

    // Add event listeners for any user interaction
    window.addEventListener('scroll', disableAutoFocus);
    window.addEventListener('mousedown', disableAutoFocus);
    window.addEventListener('touchstart', disableAutoFocus);
    window.addEventListener('keydown', disableAutoFocus);
    window.addEventListener('wheel', disableAutoFocus);

    // Auto-focus after 17 seconds if not disabled
    autoFocusTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && !concept.trim() && textareaRef.current && !autoFocusDisabledRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 17000);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('scroll', disableAutoFocus);
      window.removeEventListener('mousedown', disableAutoFocus);
      window.removeEventListener('touchstart', disableAutoFocus);
      window.removeEventListener('keydown', disableAutoFocus);
      window.removeEventListener('wheel', disableAutoFocus);
      if (autoFocusTimerRef.current) {
        clearTimeout(autoFocusTimerRef.current);
      }
    };
  }, [textareaRef]);

  useEffect(() => {
    // Notify parent when typing state changes
    onTypingChange?.(isTyping);

    // Reset states when typing
    if (isTyping) {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCountdown(null);
      setInlinePrompt("");
      setIsAiReplying(false);
      return;
    }

    // Start countdown if conditions are met and not already counting down
    if (isFocused && concept.trim().length > 20 && !isTyping && countdown === null && !isAiReplying) {
      setCountdown(countdownDuration);

      let currentCount = countdownDuration;
      countdownTimerRef.current = setInterval(() => {
        currentCount--;
        setCountdown(currentCount);

        if (currentCount <= 0) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          generatePromptMutation.mutate({ userInput: concept, recent: recentTyping });
        }
      }, 1000);
    }

    return () => {
      if (isTyping && countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [isTyping, isFocused]);

  useEffect(() => {
    // Close sidebar 3 seconds after user starts typing
    if (hasStartedTyping) {
      if (sidebarCloseTimerRef.current) {
        clearTimeout(sidebarCloseTimerRef.current);
      }
      sidebarCloseTimerRef.current = setTimeout(() => {
        try {
          if (isMobile) {
            setOpenMobile(false);
          } else {
            setOpen(false);
          }
          setTimeout(() => {
            window.dispatchEvent(new Event('sidebar-menu-clicked'));
          }, 1000);
        } catch (e) {
          // Sidebar context might not be available
        }
        sidebarCloseTimerRef.current = null;
        setHasStartedTyping(false);
      }, 3000);
    }

    return () => {
      if (sidebarCloseTimerRef.current) {
        clearTimeout(sidebarCloseTimerRef.current);
        sidebarCloseTimerRef.current = null;
      }
    };
  }, [hasStartedTyping, isMobile, setOpen, setOpenMobile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inlinePrompt) {
        e.preventDefault();
        setDismissedPrompts((prev) => [...prev, inlinePrompt]);
        setInlinePrompt("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [inlinePrompt]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setConcept(newValue);
    setIsTyping(true);
    setHasStartedTyping(true);
    setInlinePrompt("");

    // Capture what user just typed (new characters since last change)
    const justTyped = newValue.substring(lastConceptLengthRef.current);
    if (justTyped.length > 0) {
      setRecentTyping((prev) => (prev + justTyped).slice(-150)); // Keep last 150 chars
    }
    lastConceptLengthRef.current = newValue.length;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 500);
  };

  const handleSubmit = () => {
    if (!concept.trim()) return;
    submitConceptMutation.mutate(concept);
  };

  const handleVoiceTranscript = (text: string) => {
    setConcept((prev) => (prev + " " + text).trim());
    setIsFocused(true);
  };

  const handleNewConcept = () => {
    setConcept("");
    setGeneratedConcept(null);
    setInlinePrompt("");
    setDismissedPrompts([]);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  return (
    <div className="py-8">
      {!isExpanded ? (
        <button
          onClick={() => {
            setIsExpanded(true);
            setTimeout(() => textareaRef.current?.focus(), 100);
          }}
          className="group w-full bg-card border border-border rounded-lg p-6 text-left transition-all duration-200 hover-elevate hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          data-testid="button-expand-input"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-1">What did you learn today?</h3>
              <p className="text-sm text-muted-foreground">
                Share a concept and discover the real-world problems it solves
              </p>
            </div>
          </div>
        </button>
      ) : (
        <>
          <div className="space-y-1 mb-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">What did you learn today?</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setHistoryOpen(true)}
                data-testid="button-history"
              >
                <Clock className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
            </div>
            <p className="text-base text-muted-foreground">
              Share a concept and discover the real-world problems it solves
            </p>
          </div>

          <HistoryDialog
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            onSelectConcept={(conceptTitle) => {
              setConcept(conceptTitle);
              setIsFocused(true);
              setTimeout(() => textareaRef.current?.focus(), 100);
            }}
          />

          <div className="space-y-3">
            <div
              className={`border-b-2 transition-all duration-200 ${
                isFocused ? "border-primary" : "border-border"
              }`}
            >
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  placeholder="start typing..."
                  value={concept}
                  onChange={handleInputChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => !concept && setIsFocused(false)}
                  className="w-full min-h-[3rem] resize-none bg-transparent border-0 focus:outline-none text-base p-0 placeholder:text-muted-foreground"
                  style={{ overflow: 'hidden' }}
                  data-testid="input-concept"
                />
                {isTyping && concept.trim().length > 20 && (
                  <div className="text-muted-foreground/60 italic text-sm mt-1 flex items-center gap-1" data-testid="typing-indicator">
                    <span>You're typing</span>
                    <span className="inline-flex gap-0.5">
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                    </span>
                  </div>
                )}
                {countdown !== null && countdown > 0 && !isTyping && (
                  <div className="text-muted-foreground/60 italic text-sm mt-1" data-testid="countdown-indicator">
                    AI prompt in {countdown}s
                  </div>
                )}
                {isAiReplying && (
                  <div className="text-muted-foreground/60 italic text-sm mt-1 flex items-center gap-1" data-testid="ai-replying-indicator">
                    <span>AI replying</span>
                    <span className="inline-flex gap-0.5">
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                    </span>
                  </div>
                )}
                {inlinePrompt && !isTyping && !isAiReplying && (
                  <div className="text-muted-foreground/60 italic text-sm mt-1" data-testid="inline-prompt">
                    {inlinePrompt}
                  </div>
                )}
              </div>
            </div>

            {(isFocused || concept) && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <VoiceInput onTranscript={handleVoiceTranscript} />
                <div className="flex gap-2">
                  {generatedConcept && !concept.trim() ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNewConcept}
                      data-testid="button-new-concept"
                    >
                      New Concept
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConcept("");
                          setInlinePrompt("");
                          setDismissedPrompts([]);
                          setIsFocused(false);
                          setIsExpanded(false);
                        }}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!concept.trim() || submitConceptMutation.isPending}
                        data-testid="button-explore"
                      >
                        {submitConceptMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {generatedConcept && (
            <div className="mt-8" ref={generatedConceptRef}>
              <KnowledgeDetail
                key={generatedConcept.id}
                id={generatedConcept.id}
                title={generatedConcept.title}
                category={generatedConcept.category}
                problem={generatedConcept.problem}
                what={generatedConcept.what}
                why={generatedConcept.why}
                how={generatedConcept.how}
                where={generatedConcept.where}
                who={generatedConcept.who}
                when={generatedConcept.when}
                pseudocode={generatedConcept.pseudocode || undefined}
                tags={generatedConcept.tags || undefined}
                isFavorite={generatedConcept.isFavorite || undefined}
                timestamp={formatDistanceToNow(new Date(generatedConcept.createdAt), { addSuffix: true })}
                onDelete={() => setGeneratedConcept(null)}
                defaultCollapsed={false}
                persistCollapsedState={true}
                isParentTyping={concept.trim().length > 0}
                forceCollapsed={concept.trim().length > 0}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}