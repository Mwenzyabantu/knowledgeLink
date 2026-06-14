import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { localStorage } from "@/lib/services/localStorage";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GenerationStatusPage } from "@/components/generation-status-page";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lightbulb,
  ArrowRight,
  Pencil,
  Plus,
  Trash2,
  MessageSquare,
  Clock,
  RefreshCw,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const toRoman = (n: number): string => {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["m","cm","d","cd","c","xc","l","xl","x","ix","v","iv","i"];
  let result = "";
  let num = n;
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MissingSkill {
  skill: string;
  importance: "essential" | "helpful" | "optional";
  resources: { type: string; title: string; url: string }[];
}

interface IdeaAnalysis {
  projectName: string;
  projectType: string;
  description: string;
  difficulty: string;
  estimatedHours: number;
  requiredSkills: string[];
  alreadyHas: { skill: string; matchedConcept: string }[];
  missing: MissingSkill[];
  readinessScore: number;
  summary: string;
}

interface IdeaSession {
  id: number;
  title: string;
  messages: ChatMessage[];
  ideaSummary: string | null;
  analysis: IdeaAnalysis | null;
  status: string;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm here to help you turn your idea into a real project. Tell me — what's on your mind? It could be an app, a tool, something to solve a problem you face, or a project you've been thinking about.",
};

type Step = "chat" | "analysis" | "generating";

export default function Ideas() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [analysis, setAnalysis] = useState<IdeaAnalysis | null>(null);
  const [ideaSummary, setIdeaSummary] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [isNavigatingToProject, setIsNavigatingToProject] = useState(false);
  const [showMyIdeas, setShowMyIdeas] = useState(false);
  const [readyToAdvance, setReadyToAdvance] = useState(false);
  const [pendingIdeaSummary, setPendingIdeaSummary] = useState("");
  const isRefiningRef = useRef(false);
  const autoLoadedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<IdeaSession[]>({
    queryKey: ["/api/idea-sessions"],
  });

  const createSessionMutation = useMutation({
    mutationFn: async (payload: { title: string; messages: ChatMessage[] }) => {
      const session = localStorage.ideas.add(payload.title, payload.messages);
      return session as unknown as IdeaSession;
    },
    onSuccess: (session) => {
      setActiveSessionId(session.id as any);
      queryClient.invalidateQueries({ queryKey: ["/api/idea-sessions"] });
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<IdeaSession> }) => {
      // Static: localStorage-based; no-op for now
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/idea-sessions"] });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      // Static: localStorage-based; no-op for now
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/idea-sessions"] });
    },
  });

  const [lastFailedMessages, setLastFailedMessages] = useState<ChatMessage[] | null>(null);

  const chatMutation = useMutation({
    mutationFn: async (updatedMessages: ChatMessage[]) => {
      const lastUserMsg = updatedMessages.filter(m => m.role === "user").pop();
      const history = updatedMessages.slice(0, -1);
      const response = lastUserMsg
        ? await generateChatResponse(lastUserMsg.content, history)
        : "";
      return { reply: response, isReadyToAnalyze: false, ideaSummary: "" };
    },
    onSuccess: async (data, updatedMessages) => {
      setLastFailedMessages(null);
      const assistantMsg: ChatMessage = { role: "assistant", content: data.reply };
      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      const userMessages = updatedMessages.filter(m => m.role === "user");
      const title = userMessages[0]?.content?.slice(0, 60) || "New Idea";
      const storedMessages = finalMessages.filter(m => m.content?.trim() && !(m.role === "assistant" && m.content === GREETING.content));

      if (!activeSessionId) {
        createSessionMutation.mutate({ title, messages: storedMessages });
      } else {
        localStorage.ideas.update(activeSessionId.toString(), storedMessages);
      }

      if (data.isReadyToAnalyze && data.ideaSummary) {
        setPendingIdeaSummary(data.ideaSummary);
        setReadyToAdvance(true);
      }
    },
    onError: (_err, updatedMessages) => {
      setLastFailedMessages(updatedMessages);
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async ({ ideaSummary, chatHistory }: { ideaSummary: string; chatHistory: ChatMessage[] }) => {
      // Static: return mock analysis for now
      const mock: IdeaAnalysis = {
        projectName: ideaSummary.slice(0, 40),
        projectType: "app",
        description: "A project based on your idea.",
        difficulty: "intermediate",
        estimatedHours: 20,
        requiredSkills: ["JavaScript", "React"],
        alreadyHas: [],
        missing: [],
        readinessScore: 70,
        summary: ideaSummary,
      };
      return mock;
    },
    onSuccess: (data: IdeaAnalysis) => {
      setAnalysis(data);
      setStep("analysis");
      if (activeSessionId) {
        updateSessionMutation.mutate({
          id: activeSessionId,
          data: { analysis: data as any, status: "analyzed", ideaSummary },
        });
      }
    },
    onError: () => {
      toast({ title: "Analysis failed", description: "Could not analyze your idea. Please try again.", variant: "destructive" });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      // Static: create a local project
      const mockProject = {
        id: Math.floor(Math.random() * 100000),
        title: analysis?.projectName || "New Project",
        summary: analysis?.summary || "",
        difficulty: "intermediate",
        skills: analysis?.requiredSkills || [],
        status: "opportunity",
        createdAt: new Date().toISOString(),
      };
      localStorage.projects.add(mockProject as any);
      return { projectId: mockProject.id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunity-projects"] });
      setProjectId(data.projectId);
      setStep("generating");
      if (activeSessionId) {
        updateSessionMutation.mutate({
          id: activeSessionId,
          data: { projectId: data.projectId, status: "completed" },
        });
      }
    },
    onError: () => {
      toast({ title: "Could not create project", description: "Please try again.", variant: "destructive" });
    },
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;
    const updated: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(updated);
    setInput("");
    setReadyToAdvance(false);
    setPendingIdeaSummary("");
    setLastFailedMessages(null);
    chatMutation.mutate(updated);
  };

  const handleRetryChat = () => {
    if (!lastFailedMessages || chatMutation.isPending) return;
    chatMutation.mutate(lastFailedMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewIdea = () => {
    setActiveSessionId(null);
    setStep("chat");
    setMessages([GREETING]);
    setInput("");
    setAnalysis(null);
    setIdeaSummary("");
    setProjectId(null);
    setReadyToAdvance(false);
    setPendingIdeaSummary("");
    isRefiningRef.current = false;
  };

  const handleRefineIdea = () => {
    setStep("chat");
    setAnalysis(null);
    setIdeaSummary("");
    setInput("");
    setProjectId(null);
    setReadyToAdvance(false);
    setPendingIdeaSummary("");
    isRefiningRef.current = true;
    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content: "Sure! What would you like to add or change about your idea? Take your time — when you're happy with everything, click \"skip to readiness check\" to continue.",
      },
    ]);
  };

  const handleViewBuiltProject = async () => {
    if (!projectId) return;
    setIsNavigatingToProject(true);
    try {
      let implId: number | null = null;

      // Static: search localStorage for matching project
      const projects = localStorage.projects.getAll();
      const match = projects.find((p: any) => p.id === projectId);
      if (match) implId = match.id as number;

      if (implId) {
        setLocation(`/implementation/${implId}`);
      } else {
        // No implementation found — go through generation step
        setStep("generating");
      }
    } catch {
      toast({ title: "Could not load project", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsNavigatingToProject(false);
    }
  };

  const handleLoadSession = (session: IdeaSession) => {
    isRefiningRef.current = false;
    setActiveSessionId(session.id);
    setIdeaSummary(session.ideaSummary || "");
    setAnalysis(session.analysis || null);
    setProjectId(session.projectId || null);

    const stored = session.messages || [];
    setMessages([GREETING, ...stored.filter(m => m.content?.trim() && m.content !== GREETING.content)]);

    if (session.status === "analyzed" || session.status === "completed") {
      setStep("analysis");
    } else {
      setStep("chat");
    }
    setInput("");
    setShowMyIdeas(false);
  };

  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (sessions.length === 0) return;
    const params = new URLSearchParams(search);
    const sessionId = params.get("session");
    if (!sessionId) return;
    const target = sessions.find((s) => s.id === parseInt(sessionId));
    if (target) {
      autoLoadedRef.current = true;
      handleLoadSession(target);
    }
  }, [sessions, search]);

  const handleDeleteSession = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteSessionMutation.mutate(id, {
      onSuccess: () => {
        if (activeSessionId === id) handleNewIdea();
      },
    });
  };

  const handleSkipToAnalysis = () => {
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length === 0) return;
    const derived = userMessages.map(m => m.content).join(" ");
    isRefiningRef.current = false;
    setReadyToAdvance(false);
    setPendingIdeaSummary("");
    setIdeaSummary(derived);
    analyzeMutation.mutate({ ideaSummary: derived, chatHistory: messages });
  };

  const handleRestartChat = () => {
    setMessages([GREETING]);
    setInput("");
    setReadyToAdvance(false);
    setPendingIdeaSummary("");
    isRefiningRef.current = false;
  };

  const handleRefreshAnalysis = () => {
    const summary = ideaSummary || messages.filter(m => m.role === "user").map(m => m.content).join(" ");
    analyzeMutation.mutate({ ideaSummary: summary, chatHistory: messages });
  };

  const handleAdvanceToAnalysis = () => {
    const summary = pendingIdeaSummary || messages.filter(m => m.role === "user").map(m => m.content).join(" ");
    isRefiningRef.current = false;
    setReadyToAdvance(false);
    setPendingIdeaSummary("");
    setIdeaSummary(summary);
    analyzeMutation.mutate({ ideaSummary: summary, chatHistory: messages });
  };

  const importanceBadgeVariant = (importance: string) => {
    if (importance === "essential") return "destructive";
    if (importance === "helpful") return "default";
    return "secondary";
  };

  const statusLabel = (s: string) => {
    if (s === "analyzed") return "Checked";
    if (s === "completed") return "Built";
    return "Chatting";
  };

  const statusColor = (s: string) => {
    if (s === "analyzed") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (s === "completed") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    return "bg-muted text-muted-foreground";
  };

  if (step === "generating" && projectId) {
    return (
      <GenerationStatusPage
        implementationId={projectId}
        onComplete={(newImplId) => {
          queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });
          setLocation(`/implementation/${newImplId || projectId}`);
        }}
        onCancel={() => setStep("analysis")}
      />
    );
  }

  const hasUserMessages = messages.filter(m => m.role === "user").length > 0;
  const isWorking = chatMutation.isPending || analyzeMutation.isPending;

  return (
    <div className="h-full max-w-3xl mx-auto flex flex-col">
      {/* My Ideas sheet */}
      <Sheet open={showMyIdeas} onOpenChange={setShowMyIdeas}>
        <SheetContent side="left" className="w-72 flex flex-col gap-3 pt-6">
          <SheetHeader>
            <SheetTitle className="text-base">My Ideas</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto flex flex-col gap-1">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 px-2">
                No previous ideas yet. Start one!
              </p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleLoadSession(s)}
                  className={cn(
                    "w-full text-left rounded-md px-3 py-2 group relative hover-elevate active-elevate-2 transition-colors",
                    activeSessionId === s.id ? "bg-accent" : ""
                  )}
                  data-testid={`session-item-${s.id}`}
                >
                  <p className="text-xs font-medium line-clamp-2 pr-5 leading-snug">{s.title}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={cn("text-[10px] rounded px-1 py-0.5 font-medium", statusColor(s.status))}>
                      {statusLabel(s.status)}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(s.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    data-testid={`button-delete-session-${s.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
      <div className="pt-6 pb-2 space-y-4 flex-1">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold">Build on Idea</h1>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMyIdeas(true)}
                  className="gap-1.5"
                  data-testid="button-my-ideas"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  My Ideas
                </Button>
                <Button
                  size="sm"
                  onClick={handleNewIdea}
                  className="gap-1.5"
                  data-testid="button-new-idea"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Idea
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Describe a problem you want to solve or a project you want to build. We'll check your skills and guide you through it.
            </p>
          </div>
        </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className={step === "chat" ? "text-primary font-semibold" : step === "analysis" || step === "generating" ? "text-muted-foreground/50" : "text-muted-foreground"}>1. Describe your idea</span>
            <span className="text-muted-foreground/40">→</span>
            <span className={step === "analysis" ? "text-primary font-semibold" : step === "generating" ? "text-muted-foreground/50" : "text-muted-foreground"}>2. Readiness check</span>
            <span className="text-muted-foreground/40">→</span>
            <span className={step === "generating" ? "text-primary font-semibold" : "text-muted-foreground"}>3. Build it</span>
            {step === "chat" && (
              <div className="ml-auto flex items-center gap-2">
                {hasUserMessages && !isWorking && (
                  <button
                    onClick={handleSkipToAnalysis}
                    className="text-xs text-muted-foreground/55 hover:text-muted-foreground/80 transition-colors border border-muted-foreground/30 hover:border-muted-foreground/50 rounded-full px-3 py-1"
                    data-testid="button-skip-to-analysis"
                  >
                    skip to readiness check →
                  </button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleRestartChat}
                  disabled={isWorking}
                  title="Restart conversation"
                  data-testid="button-restart-chat"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {step === "analysis" && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRefreshAnalysis}
                disabled={analyzeMutation.isPending}
                title="Re-run readiness check"
                data-testid="button-refresh-analysis"
                className="ml-auto"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", analyzeMutation.isPending && "animate-spin")} />
              </Button>
            )}
          </div>

          {/* STEP 1: Chat */}
          {step === "chat" && (
            <div className="space-y-3">
              <div className="min-h-[200px] max-h-[400px] overflow-y-auto space-y-3 pr-1">
                {messages.filter(msg => msg.content?.trim()).map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.role}-${i}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-md px-4 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isWorking && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-md px-4 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {analyzeMutation.isPending ? "Analyzing your idea…" : "Thinking…"}
                    </div>
                  </div>
                )}
                {lastFailedMessages && !isWorking && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleRetryChat}
                      className="flex items-center gap-1.5 text-xs text-destructive border border-destructive/30 rounded-full px-3 py-1 hover:bg-destructive/10 transition-colors"
                      data-testid="button-retry-chat"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Request failed — retry
                    </button>
                  </div>
                )}
                {readyToAdvance && !isWorking && (
                  <div className="flex justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAdvanceToAnalysis}
                      className="gap-1.5 bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400 dark:border-green-500/40 py-0.5 text-xs"
                      data-testid="button-advance-to-analysis"
                    >
                      Proceed to stage 2
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2 items-end">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. I want to build an app that tracks my daily water intake..."
                  className="resize-none text-sm"
                  rows={2}
                  disabled={isWorking}
                  data-testid="input-idea-message"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isWorking}
                  data-testid="button-send-idea"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Analysis */}
          {step === "analysis" && analysis && (
            <div className="space-y-6">
              {/* Project header */}
              <div>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                  <h2 className="text-base font-semibold leading-snug">{analysis.projectName}</h2>
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-xs capitalize">{analysis.difficulty}</Badge>
                    <Badge variant="outline" className="text-xs">~{analysis.estimatedHours}h</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{analysis.projectType}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{analysis.description}</p>
              </div>

              {/* Readiness */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Readiness</span>
                  <span className="text-lg font-bold">{analysis.readinessScore}%</span>
                </div>
                <Progress value={analysis.readinessScore} className="h-1.5" data-testid="readiness-progress" />
                {analysis.summary && (
                  <p className="text-xs text-muted-foreground border rounded-md bg-muted/50 px-3 py-2">{analysis.summary}</p>
                )}
              </div>

              {/* Skills you already have */}
              <div>
                <h3 className="text-sm text-foreground mb-3 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="underline underline-offset-2">Skills you already have</span>
                  <span className="text-xs font-normal text-muted-foreground">({analysis.alreadyHas.length})</span>
                </h3>
                {analysis.alreadyHas.length > 0 ? (
                  <div className="space-y-0.5">
                    {analysis.alreadyHas.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 py-1" data-testid={`skill-have-${i}`}>
                        <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">{toRoman(i + 1)}.</span>
                        <p className="text-sm flex-1 font-medium">{item.skill}</p>
                        <p className="text-xs text-muted-foreground shrink-0">via {item.matchedConcept}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic px-1">None identified from your learning history yet.</p>
                )}
              </div>

              {/* Skills to learn */}
              <div>
                <h3 className="text-sm text-foreground mb-3 flex items-center gap-2 font-bold">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="underline underline-offset-2">Skills to learn</span>
                  <span className="text-xs font-normal text-muted-foreground">({analysis.missing.length})</span>
                </h3>
                {analysis.missing.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 pb-1.5 mb-3 border-b">
                      <p className="text-xs text-muted-foreground flex-1">Skill</p>
                      <p className="text-xs text-muted-foreground shrink-0">Importance</p>
                    </div>
                    <div className="space-y-1">
                      {analysis.missing.map((item, i) => (
                        <div key={i} className="pt-1 pb-1" data-testid={`skill-missing-${i}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">{toRoman(i + 1)}.</span>
                            <p className="text-sm flex-1 font-medium">{item.skill}</p>
                            <Badge variant={importanceBadgeVariant(item.importance) as any} className="text-xs capitalize shrink-0">
                              {item.importance}
                            </Badge>
                          </div>
                          {(item.resources?.length ?? 0) > 0 && (
                            <div className="flex flex-col gap-1 pl-7 pt-0.5">
                              {(item.resources ?? []).map((r: any, j: number) => (
                                <a
                                  key={j}
                                  href={r.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                                  data-testid={`resource-${i}-${j}`}
                                >
                                  <Link2 className="h-3 w-3 shrink-0" />
                                  {r.title}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic px-1">All required skills are already covered by your learning history.</p>
                )}
              </div>

              <div className="flex gap-3 flex-wrap pt-2 border-t">
                {projectId ? (
                  <Button
                    onClick={handleViewBuiltProject}
                    disabled={isNavigatingToProject}
                    data-testid="button-view-built-project"
                  >
                    {isNavigatingToProject ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading…</>
                    ) : (
                      <><ExternalLink className="h-4 w-4 mr-2" />View Built Project</>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => createProjectMutation.mutate()}
                    disabled={createProjectMutation.isPending}
                    data-testid="button-proceed-to-project"
                  >
                    {createProjectMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating project…</>
                    ) : (
                      <>Proceed to Project <ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>
                )}
                <Button variant="outline" onClick={handleRefineIdea} data-testid="button-refine-idea">
                  <Pencil className="h-4 w-4 mr-2" />
                  Adjust My Idea
                </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
