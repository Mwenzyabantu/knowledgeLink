import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Star, Tag, Send, Loader2, Sparkles, X, Volume2, VolumeX, Megaphone, Volume1, Play, Pause, Square, RotateCcw, Trash2 } from "lucide-react";
import { ProjectPreferenceChat } from "./project-preference-chat";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { localStorage } from "@/lib/services/localStorage";
import { safeStorage } from "@/lib/safeStorage";
import { generateChatResponse } from "@/lib/services/supabase";
import type { ChatSession, ChatMessage, Concept, Implementation, UserPersonalization } from "@shared/schema";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { SmartReadiness } from "./smart-readiness";
import { GenerationProgressDialog } from "./generation-progress-dialog";
import { GenerationStatusPage } from "./generation-status-page";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAutoHeightTextarea } from "@/hooks/use-auto-height-textarea";
import type { GenerationStep } from "./generation-progress-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// TTS Hook for reusability
function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const { data: personalization } = useQuery<UserPersonalization>({
    queryKey: ["/api/personalization"],
  });

  const [isPaused, setIsPaused] = useState(false);

  const [toReadQueue, setToReadQueue] = useState<string[]>([]);
  const [readLog, setReadLog] = useState<string[]>([]);
  const [fullPassage, setFullPassage] = useState<string>("");

  const stop = () => {
    if (synth) {
      synth.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setToReadQueue([]);
      setReadLog([]);
    }
  };

  const speak = (text: string, startIndex: number = 0) => {
    if (!synth) return;
    
    // Clean markdown
    const cleanText = text
      .replace(/[#*`_~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[pause\]/g, " ");

    const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    setFullPassage(cleanText);
    const initialToRead = sentences.slice(startIndex);
    const initialRead = sentences.slice(0, startIndex);
    
    setToReadQueue(initialToRead);
    setReadLog(initialRead);

    if (initialToRead.length === 0) {
      setIsSpeaking(false);
      setIsPaused(false);
      return;
    }

    const processNext = (indexInQueue: number) => {
      if (indexInQueue >= initialToRead.length) {
        setIsSpeaking(false);
        setIsPaused(false);
        return;
      }

      const sentence = initialToRead[indexInQueue];
      const utterance = new SpeechSynthesisUtterance(sentence);
      
      // Voice selection
      const voices = synth.getVoices();
      let selectedVoice = null;
      if (personalization?.preferredVoice) {
        selectedVoice = voices.find(v => v.name === personalization.preferredVoice);
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => (v.name.includes("UK") || v.lang.includes("en-GB")) && (v.name.includes("Female") || v.name.includes("Google"))) || voices[0];
      }
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = 0.95;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        // "Throw" into read container and remove from to-read
        setReadLog(prev => [...prev, sentence]);
        setToReadQueue(prev => prev.slice(1));
        
        // Verification step (Internal "Third Container" logic)
        // In a real UI we could show this, but for now we follow the logic:
        // sum(read) + sum(toRead) should match fullPassage structure
        
        processNext(indexInQueue + 1);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
    };

    synth.cancel();
    processNext(0);
  };

  const pause = () => {
    if (synth && synth.speaking) {
      synth.pause();
      setIsPaused(true);
    }
  };

  const resume = () => {
    if (synth && synth.paused) {
      synth.resume();
      setIsPaused(false);
      
      // Safety fallback for "Google Network" voices
      setTimeout(() => {
        // If it's still paused or not speaking, the native resume failed
        if (synth && (synth.paused || !synth.speaking) && toReadQueue.length > 0) {
          console.log("Resume failed, restarting from queue...");
          synth.cancel();
          speak(fullPassage, readLog.length);
        }
      }, 300);
    } else if (toReadQueue.length > 0) {
      // If state lost or synth was cancelled, restart from the current "to-read" position
      speak(fullPassage, readLog.length);
    }
  };

  useEffect(() => {
    // Voice list might not be ready immediately
    if (synth && synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = () => {
        // Just triggering a re-check if needed
      };
    }
    
    // STOP reading on page refresh/unmount
    return () => {
      if (synth) synth.cancel();
    };
  }, [synth]);

  return { speak, stop, pause, resume, isSpeaking, isPaused };
}

interface KnowledgeDetailProps {
  id?: number;
  title: string;
  category: string;
  what: string;
  why: string;
  how: string;
  where: string[];
  who: string;
  when: string;
  problem: string;
  pseudocode?: string;
  timestamp: string;
  tags?: string[];
  isFavorite?: boolean;
  onDelete?: () => void;
  onCancel?: () => void;
  defaultCollapsed?: boolean;
  persistCollapsedState?: boolean;
  isParentTyping?: boolean;
  forceCollapsed?: boolean;
}

export function KnowledgeDetail({
  id,
  title,
  category,
  what,
  why,
  how,
  where,
  who,
  problem,
  pseudocode,
  timestamp,
  tags = [],
  isFavorite = false,
  onDelete,
  defaultCollapsed = true,
  persistCollapsedState = false,
  isParentTyping = false,
  forceCollapsed = false,
}: KnowledgeDetailProps) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [chatOpen, setChatOpen] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (!id) return defaultCollapsed;
    if (defaultCollapsed === true) return true;
    // Only load from localStorage if persistCollapsedState is true
    if (persistCollapsedState) {
      try {
        const stored = safeStorage.getItem(`concept-collapsed-${id}`);
        return stored ? JSON.parse(stored) : defaultCollapsed;
      } catch {
        return defaultCollapsed;
      }
    }
    return defaultCollapsed;
  });

  // Collapse/expand based on parent typing state
  useEffect(() => {
    if (forceCollapsed) {
      setCollapsed(true);
    }
  }, [forceCollapsed]);

  // Track if concept was just created (first time rendered)
  useEffect(() => {
    if (!collapsed && !safeStorage.getItem(`concept-animated-${id}`)) {
      setShouldAnimate(true);
      safeStorage.setItem(`concept-animated-${id}`, 'true');
    }
  }, [id, collapsed]);
  const [userMessage, setUserMessage] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [implementationPreview, setImplementationPreview] = useState<Implementation | null>(null);
  const [showProceedDialog, setShowProceedDialog] = useState(false);

  // Fetch concept data to get the latest implementation
  const { data: conceptData } = useQuery<Concept & { latestImplementation: Implementation | null }>({
    queryKey: id ? [`/api/concepts/${id}`] : [],
    enabled: !!id,
  });

  // Sync implementation preview from concept data
  useEffect(() => {
    if (conceptData?.latestImplementation) {
      setImplementationPreview(conceptData.latestImplementation);
    }
  }, [conceptData]);
  const [showReadinessAssessment, setShowReadinessAssessment] = useState(false);
  const [showPreferenceChat, setShowPreferenceChat] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [hasClickedGenerate, setHasClickedGenerate] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const [isShowingStatusPage, setIsShowingStatusPage] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { id: 'analyze', label: 'Analyzing your concept', status: 'pending' },
    { id: 'understand', label: 'Understanding requirements', status: 'pending' },
    { id: 'generate', label: 'Generating implementation', status: 'pending' },
    { id: 'compile', label: 'Preparing project', status: 'pending' },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const implementationPreviewRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { speak: speakMain, stop: stopMain, pause: pauseMain, resume: resumeMain, isSpeaking: isSpeakingMain, isPaused: isPausedMain } = useTextToSpeech();
  const { speak: speakChat, stop: stopChat, pause: pauseChat, resume: resumeChat, isSpeaking: isSpeakingChatId, isPaused: isPausedChatId } = useTextToSpeech();
  const [currentlySpeakingChatId, setCurrentlySpeakingChatId] = useState<number | null>(null);

  const handleToggleMainSpeech = () => {
    if (isSpeakingMain && !isPausedMain) {
      pauseMain();
    } else if (isPausedMain) {
      resumeMain();
    } else {
      const contentToRead = `
        ${title}.
        [pause]
        What Problem Does This Solve?
        ${problem}
        [pause]
        What is it?
        ${what}
        [pause]
        Why does it matter?
        ${why}
        [pause]
        How does it work?
        ${how}
        [pause]
        Where is it used?
        It is used in ${where.join(", ")}.
        [pause]
        Who uses this?
        ${who}
      `;
      speakMain(contentToRead);
    }
  };

  const handleStopMainSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopMain();
  };

  const handleToggleChatSpeech = (messageId: number, content: string) => {
    if (currentlySpeakingChatId === messageId) {
      if (isSpeakingChatId && !isPausedChatId) {
        pauseChat();
      } else if (isPausedChatId) {
        resumeChat();
      } else {
        setCurrentlySpeakingChatId(null);
      }
    } else {
      stopChat();
      setCurrentlySpeakingChatId(messageId);
      speakChat(content);
    }
  };

  const handleStopChatSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopChat();
    setCurrentlySpeakingChatId(null);
  };

  // Reset chat speaking state if speaker ends naturally
  useEffect(() => {
    if (!isSpeakingChatId) {
      setCurrentlySpeakingChatId(null);
    }
  }, [isSpeakingChatId]);

  const { data: chatSession } = useQuery<ChatSession | null>({
    queryKey: id ? [`/api/concepts/${id}/chat-session`] : [],
    enabled: !!id && chatOpen,
  });

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: sessionId ? [`/api/chat-sessions/${sessionId}/messages`] : [],
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (chatSession) {
      setSessionId(chatSession.id);
    }
  }, [chatSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (implementationPreview && chatOpen) {
      setChatOpen(false);
    }
  }, [implementationPreview]);

  useEffect(() => {
    if (implementationPreview && implementationPreviewRef.current) {
      setTimeout(() => {
        implementationPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [implementationPreview]);

  useEffect(() => {
    if (id && implementationPreview) {
      // We no longer rely solely on localStorage as we fetch from the backend
      safeStorage.setItem(`implementation-preview-${id}`, JSON.stringify(implementationPreview));
    }
  }, [implementationPreview, id]);

  useEffect(() => {
    if (id && persistCollapsedState) {
      safeStorage.setItem(`concept-collapsed-${id}`, JSON.stringify(collapsed));
    }
  }, [collapsed, id, persistCollapsedState]);

  useEffect(() => {
    if (id && !implementationPreview) {
      safeStorage.removeItem(`implementation-preview-${id}`);
    }
  }, [id]);

  useEffect(() => {
    if (id && !collapsed) {
      // Update lastAccessedAt only when concept is expanded/opened
      // Static: no-op
    }
  }, [id, collapsed]);

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const session = localStorage.chats.add(title, []);
      return session as unknown as ChatSession;
    },
    onSuccess: (newSession: ChatSession) => {
      setSessionId(newSession.id);
      if (id) {
        queryClient.invalidateQueries({ queryKey: [`/api/concepts/${id}/chat-session`] });
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const session = await createSessionMutation.mutateAsync();
        currentSessionId = session.id;
      }
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
      const conceptContext = `Title: ${title}\nWhat: ${what}\nWhy: ${why}\nHow: ${how}`;
      const response = await generateChatResponse(message, conversationHistory, conceptContext);
      return { sessionId: currentSessionId, response };
    },
    onSuccess: () => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: [`/api/chat-sessions/${sessionId}/messages`] });
      }
      setUserMessage("");
      setLastFailedChatMessage(null);
    },
    onError: (_err, message) => {
      setLastFailedChatMessage(message);
    },
  });

  const generateImplementationMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Concept ID is required");
      
      setGenerationSteps([
        { id: 'analyze', label: 'Analyzing your concept', status: 'in-progress' },
        { id: 'understand', label: 'Understanding requirements', status: 'pending' },
        { id: 'generate', label: 'Generating implementation', status: 'pending' },
        { id: 'compile', label: 'Preparing project', status: 'pending' },
      ]);
      
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
      
      // Artificial delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      setGenerationSteps(prev => [
        { ...prev[0], status: 'completed' as const },
        { ...prev[1], status: 'in-progress' as const },
        ...prev.slice(2)
      ]);
      
      // Static: generate mock implementation
      const mock: Implementation = {
        id: crypto.randomUUID(),
        projectName: `Implement ${title}`,
        conceptTitle: title,
        conceptId: id,
        tool: "React",
        language: "TypeScript",
        problemAddressed: what,
        learningGoals: [why],
        prerequisites: [how],
        code: "// Example code\nconsole.log('Hello World');",
        flowChart: "graph TD\nA[Start] --> B[End]",
        resources: [],
        explanation: what,
        extensions: [],
        status: "preview",
        createdAt: new Date().toISOString(),
      };

      setGenerationSteps(prev => [
        ...prev.slice(0, 2).map(s => ({ ...s, status: 'completed' as const })),
        { ...prev[2], status: 'in-progress' as const },
        prev[3]
      ]);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      setGenerationSteps(prev => [
        ...prev.slice(0, 3).map(s => ({ ...s, status: 'completed' as const })),
        { ...prev[3], status: 'in-progress' as const }
      ]);
      
      return mock;
    },
    onSuccess: (preview: Implementation) => {
      setGenerationSteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })));
      if (id) {
        safeStorage.setItem(`implementation-preview-${id}`, JSON.stringify(preview));
      }
      setTimeout(() => {
        setImplementationPreview(preview);
        setShowReadinessAssessment(false);
        setIsRegenerating(false);
        setGenerationError(false);
        setGenerationSteps([
          { id: 'analyze', label: 'Analyzing your concept', status: 'pending' },
          { id: 'understand', label: 'Understanding requirements', status: 'pending' },
          { id: 'generate', label: 'Generating implementation', status: 'pending' },
          { id: 'compile', label: 'Preparing project', status: 'pending' },
        ]);
        toast({
          title: "Implementation generated!",
          description: "Your project preview is ready.",
        });
        queryClient.invalidateQueries({ queryKey: [`/api/concepts/${id}`] });
      }, 500);
    },
    onError: (error) => {
      setIsRegenerating(false);
      setGenerationError(true);
      setGenerationSteps([
        { id: 'analyze', label: 'Analyzing your concept', status: 'pending' },
        { id: 'understand', label: 'Understanding requirements', status: 'pending' },
        { id: 'generate', label: 'Generating implementation', status: 'pending' },
        { id: 'compile', label: 'Preparing project', status: 'pending' },
      ]);
      toast({
        title: "Generation failed",
        description: "Failed to generate implementation. Click retry to try again.",
        variant: "destructive",
      });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (newFavoriteState: boolean) => {
      if (!id) throw new Error("Concept ID is required");
      const concepts = localStorage.concepts.getAll();
      const updated = concepts.map((c: any) =>
        c.id === id ? { ...c, isFavorite: newFavoriteState } : c
      );
      localStorage.concepts.setAll(updated);
      return { success: true };
    },
    onSuccess: (_, newFavoriteState) => {
      queryClient.invalidateQueries({ queryKey: ["/api/concepts"] });
      toast({
        title: newFavoriteState ? "Added to favorites" : "Removed from favorites",
        description: newFavoriteState ? `"${title}" has been saved to your favorites.` : `"${title}" has been removed from your favorites.`,
      });
    },
    onError: () => {
      setFavorite(favorite);
      toast({
        title: "Error",
        description: "Failed to save favorite status.",
        variant: "destructive",
      });
    },
  });

  const deleteImplementationMutation = useMutation({
    mutationFn: async (implementationId: number) => {
      localStorage.projects.delete(implementationId.toString());
    },
    onSuccess: () => {
      if (id) {
        safeStorage.removeItem(`implementation-preview-${id}`);
      }
      setImplementationPreview(null);
      setShowReadinessAssessment(false);
      setCollapsed(true);
      if (onDelete) {
        onDelete();
      }
      toast({
        title: "Cancelled",
        description: "Implementation preview has been removed.",
      });
    },
    onError: (error) => {
      // Even if delete fails, collapse the concept and clear preview
      if (id) {
        safeStorage.removeItem(`implementation-preview-${id}`);
      }
      setImplementationPreview(null);
      setShowReadinessAssessment(false);
      setCollapsed(true);
      if (onDelete) {
        onDelete();
      }
      toast({
        title: "Cancelled",
        description: "Implementation preview has been cleared.",
        variant: "destructive",
      });
    },
  });

  const deleteConceptMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Concept ID is required");
      localStorage.concepts.delete(id.toString());
    },
    onSuccess: () => {
      if (id) {
        safeStorage.removeItem(`concept-collapsed-${id}`);
        safeStorage.removeItem(`concept-animated-${id}`);
        safeStorage.removeItem(`implementation-preview-${id}`);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/concepts"] });
      toast({
        title: "Concept Deleted",
        description: `"${title}" and all related data have been removed.`,
      });
      if (onDelete) onDelete();
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: "Could not delete the concept. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [lastFailedChatMessage, setLastFailedChatMessage] = useState<string | null>(null);

  const handleSendMessage = () => {
    if (!userMessage.trim()) return;
    setLastFailedChatMessage(null);
    sendMessageMutation.mutate(userMessage);
  };

  const handleRetryChatMessage = () => {
    if (!lastFailedChatMessage || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(lastFailedChatMessage);
  };

  const handleAskQuestion = () => {
    setChatOpen(true);
    if (messages.length > 0) {
      setCollapsed(true);
    }
  };

  const handleGenerateImplementation = () => {
    setHasClickedGenerate(true);
    setGenerationError(false);
    generateImplementationMutation.mutate();
  };

  const handleRetryGeneration = () => {
    setGenerationError(false);
    generateImplementationMutation.mutate();
  };

  const handleGenerateNew = () => {
    setShowPreferenceChat(true);
  };

  const handlePreferenceGenerate = async (preferences: any) => {
    setShowPreferenceChat(false);
    setIsRegenerating(true);
    try {
      if (implementationPreview?.id) {
        localStorage.projects.delete(implementationPreview.id.toString());
      }
      if (id) {
        safeStorage.removeItem(`implementation-preview-${id}`);
      }
      setImplementationPreview(null);
      generateImplementationMutation.mutate();
    } catch (error) {
      setIsRegenerating(false);
      toast({
        title: "Error",
        description: "Failed to regenerate implementation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProceed = () => {
    if (implementationPreview?.id) {
      // If instructions already exist, it means the project guide was already generated
      if (implementationPreview.instructions && implementationPreview.instructions.trim().length > 0) {
        setShowProceedDialog(true);
      } else {
        setIsShowingStatusPage(true);
      }
    }
  };

  const handleConfirmProceed = () => {
    setShowProceedDialog(false);
    if (implementationPreview?.id) {
      setLocation(`/implementation/${implementationPreview.id}`);
    }
  };

  const handleCreateNewImplementation = () => {
    setShowProceedDialog(false);
    handleGenerateNew();
  };

  const handleGenerationComplete = () => {
    if (implementationPreview?.id) {
      setLocation(`/implementation/${implementationPreview.id}`);
    }
  };

  const handleGenerationCancel = () => {
    setIsShowingStatusPage(false);
  };

  const handleCancel = () => {
    if (implementationPreview?.id) {
      deleteImplementationMutation.mutate(implementationPreview.id);
    } else {
      // If no preview to delete, just collapse
      setCollapsed(true);
      if (onDelete) {
        onDelete();
      }
    }
  };

  // Generate dynamic prerequisites following the 4-category model:
  // 1. Tool & Environment (what to use)
  // 2. Conceptual Foundations (foundational concepts)
  // 3. Domain Knowledge (high-level only, not the specific outcome)
  // 4. Meta-Skills (general abilities)
  // KEY RULE: Remove anything that is directly part of the project's learning outcome
  const generatePrerequisitesFromImplementation = () => {
    if (!implementationPreview) return [];

    const prerequisites: Array<{ name: string; level: "essential" | "helpful" | "optional"; learned: boolean }> = [];
    const seen = new Set<string>(); // Track to avoid duplicates

    const addPrereq = (name: string, level: "essential" | "helpful" | "optional") => {
      const normalized = name.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        prerequisites.push({ name, level, learned: false });
      }
    };

    // ============================================
    // 1️⃣ TOOL & ENVIRONMENT PREREQUISITES
    // ============================================
    // These are what the user must already know how to use
    
    if (implementationPreview.tool) {
      // Primary tool/environment
      addPrereq(`Basic familiarity with ${implementationPreview.tool}`, "essential");
      addPrereq(`Know how to navigate ${implementationPreview.tool} interface`, "essential");

      // Special cases for common tools
      if (implementationPreview.tool.toLowerCase().includes("simulink")) {
        addPrereq("Basic understanding of what Simulink is", "essential");
      }
      if (implementationPreview.tool.toLowerCase().includes("matlab")) {
        addPrereq("Familiar with MATLAB documentation and help system", "helpful");
      }
    }

    if (implementationPreview.language) {
      // Only add language as prerequisite if it's different from tool
      if (implementationPreview.language.toLowerCase() !== implementationPreview.tool?.toLowerCase()) {
        addPrereq(`Basic ${implementationPreview.language} programming`, "essential");
      }
    }

    // ============================================
    // 2️⃣ CONCEPTUAL FOUNDATIONS
    // ============================================
    // Broad foundational understanding before diving deeper
    
    if (implementationPreview.type) {
      const typeLC = implementationPreview.type.toLowerCase();
      
      // Simulation projects
      if (typeLC.includes("simulation")) {
        addPrereq("Basic understanding of what a simulation is", "essential");
      }
      
      // Control system projects
      if (typeLC.includes("control")) {
        addPrereq("Basic understanding of feedback and control concepts", "helpful");
      }
      
      // Model/modeling projects
      if (typeLC.includes("model")) {
        addPrereq("Basic understanding of mathematical modeling", "helpful");
      }
    }

    // ============================================
    // 3️⃣ DOMAIN KNOWLEDGE (HIGH-LEVEL ONLY)
    // ============================================
    // Broad domain foundations, NOT specific learning outcomes
    
    if (implementationPreview.industry) {
      const industryLC = implementationPreview.industry.toLowerCase();
      
      // Physics domain
      if (industryLC.includes("physics")) {
        addPrereq("Basic physics knowledge (forces, motion, energy)", "essential");
      }
      
      // Mechanical engineering
      if (industryLC.includes("mechanical") || industryLC.includes("engineering")) {
        addPrereq("Basic understanding of mechanical systems terminology", "helpful");
      }
      
      // Electronics/Circuits
      if (industryLC.includes("electronics") || industryLC.includes("circuit")) {
        addPrereq("Basic circuits knowledge", "helpful");
      }
      
      // Control systems domain
      if (industryLC.includes("control")) {
        addPrereq("Know what PID control is at a high level", "helpful");
      }
      
      // Any domain: general foundational knowledge
      addPrereq(`Familiarity with core ${implementationPreview.industry} concepts at a basic level`, "helpful");
    }

    // ============================================
    // 4️⃣ META-SKILLS (General, always helpful)
    // ============================================
    
    addPrereq("Ability to follow step-by-step instructions", "optional");
    addPrereq("Ability to troubleshoot basic errors and debug", "optional");

    return prerequisites;
  };

  // Show status page if generating
  if (isShowingStatusPage && implementationPreview?.id) {
    return (
      <GenerationStatusPage
        implementationId={implementationPreview.id}
        onComplete={handleGenerationComplete}
        onCancel={handleGenerationCancel}
      />
    );
  }

  return (
    <div className="py-6 border-b last:border-b-0">
      <AlertDialog open={showProceedDialog} onOpenChange={setShowProceedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing Project Found</AlertDialogTitle>
            <AlertDialogDescription>
              You already have a generated project for "{implementationPreview?.projectName}". 
              Would you like to proceed to the existing one or create a completely new implementation?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowProceedDialog(false)}>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleCreateNewImplementation} className="h-9 px-4 py-2">
              Create New
            </Button>
            <AlertDialogAction onClick={handleConfirmProceed}>
              Proceed to Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className={cn("w-full flex items-start justify-between gap-4 mb-4 flex-wrap transition-opacity duration-200", (userMessage.trim() || isParentTyping) && "opacity-5 pointer-events-none")}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 
              className={cn(
                "text-[18px] font-semibold cursor-pointer hover:text-primary transition-colors", 
                shouldAnimate ? "knowledge-header-animate" : "knowledge-header-static"
              )}
              onClick={() => setCollapsed(!collapsed)}
              data-testid="text-knowledge-title"
            >
              {title}
            </h2>
            {!collapsed && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 px-2 flex items-center gap-1.5 transition-all",
                    (isSpeakingMain || isPausedMain) ? "border-primary text-primary" : "text-muted-foreground"
                  )}
                  onClick={handleToggleMainSpeech}
                  data-testid="button-read-aloud-main"
                  title={isSpeakingMain && !isPausedMain ? "Pause reading" : isPausedMain ? "Resume reading" : "Read aloud"}
                >
                  {isSpeakingMain && !isPausedMain ? (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Pause</span>
                      <Pause className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider">{isPausedMain ? "Resume" : "Read"}</span>
                      {isPausedMain ? <Play className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </>
                  )}
                </Button>
                {(isSpeakingMain || isPausedMain) && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                      onClick={handleStopMainSpeech}
                      data-testid="button-stop-reading-main"
                      title="Stop reading"
                    >
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                const newState = !favorite;
                setFavorite(newState);
                toggleFavoriteMutation.mutate(newState);
              }}
              data-testid="button-favorite"
              disabled={toggleFavoriteMutation.isPending}
            >
              <Star className={`h-4 w-4 ${favorite ? "fill-primary text-primary" : ""}`} />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors"
                  data-testid="button-delete-concept"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      This action will permanently delete the concept <span className="font-semibold text-foreground">"{title}"</span> and all its associated data.
                    </p>
                    <div className="rounded-md bg-muted p-3 text-xs space-y-2">
                      <p className="font-medium">The following items will be removed:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>The core concept definition and insights</li>
                        {conceptData?.latestImplementation && (
                          <li>The project: <span className="font-semibold">{conceptData.latestImplementation.projectName}</span></li>
                        )}
                        {chatSession && (
                          <li>The entire chat history and clarification sessions</li>
                        )}
                        <li>All learning progress and readiness assessments</li>
                      </ul>
                    </div>
                    <p className="text-destructive font-medium">This cannot be undone.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteConceptMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteConceptMutation.isPending}
                  >
                    {deleteConceptMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Delete Concept & All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className={cn("flex items-center gap-2 flex-wrap", shouldAnimate ? "knowledge-tag-time-animate" : "knowledge-tag-time-static")}>
            <Badge variant="secondary" data-testid={`badge-${category.toLowerCase()}`}>
              {category}
            </Badge>
            {tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground">{timestamp}</span>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex-shrink-0 w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center hover:bg-accent hover:border-primary/40 transition-all"
        >
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
      {!collapsed ? (
        <div className="space-y-6">
          <div className={cn("knowledge-section", shouldAnimate ? "knowledge-what-problem-animate" : "knowledge-what-problem-static")}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              What Problem Does This Solve?
            </h3>
            <p className="text-sm leading-relaxed" data-testid="text-problem">
              {problem}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className={cn("knowledge-section", shouldAnimate ? "knowledge-what-animate" : "knowledge-what-static")}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                What is it?
              </h3>
              <p className="text-sm leading-relaxed" data-testid="text-what">
                {what}
              </p>
            </div>

            <div className={cn("knowledge-section", shouldAnimate ? "knowledge-why-animate" : "knowledge-why-static")}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Why does it matter?
              </h3>
              <p className="text-sm leading-relaxed" data-testid="text-why">
                {why}
              </p>
            </div>
          </div>

          <div className={cn("knowledge-section", shouldAnimate ? "knowledge-how-animate" : "knowledge-how-static")}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              How does it work?
            </h3>
            <p className="text-sm leading-relaxed" data-testid="text-how">
              {how}
            </p>
          </div>

          <div className={cn("knowledge-section", shouldAnimate ? "knowledge-where-animate" : "knowledge-where-static")}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Where is it used?
            </h3>
            <ul className="space-y-1.5">
              {where.map((location, index) => (
                <li key={index} className="flex items-start gap-2 text-sm" data-testid={`text-where-${index}`}>
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span className="leading-relaxed">{location}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={cn("knowledge-section", shouldAnimate ? "knowledge-who-animate" : "knowledge-who-static")}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Who uses this?
            </h3>
            <p className="text-sm leading-relaxed" data-testid="text-who">
              {who}
            </p>
          </div>

          {!implementationPreview && !chatOpen && (!hasClickedGenerate || generationError) && (
            <div className="pt-4 border-t flex flex-col gap-2 items-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAskQuestion}
                data-testid="button-ask-question"
              >
                Ask a Question
              </Button>
              <div className="flex gap-2 items-center w-full flex-wrap">
                <Button
                  onClick={generationError ? handleRetryGeneration : handleGenerateImplementation}
                  disabled={generateImplementationMutation.isPending || !id}
                  data-testid={generationError ? "button-retry-implementation" : "button-generate-implementation"}
                >
                  {generateImplementationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : generationError ? (
                    <>
                      Retry Generation
                    </>
                  ) : (
                    <>
                      Generate Implementation
                    </>
                  )}
                </Button>
                {conceptData?.latestImplementation && !implementationPreview && (
                  <Button
                    variant="outline"
                    onClick={() => setImplementationPreview(conceptData.latestImplementation)}
                    data-testid="button-show-past-implementation"
                  >
                    Show Past Implementation
                  </Button>
                )}
                {generationError && (
                  <span className="text-xs text-destructive">Generation failed. Please try again.</span>
                )}
              </div>
            </div>
          )}

          {implementationPreview && (
            <div ref={implementationPreviewRef} className="pt-4 border-t space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{implementationPreview.projectName}</CardTitle>
                      <CardDescription className="mt-1">
                        {implementationPreview.type} • {implementationPreview.tool} ({implementationPreview.language})
                      </CardDescription>
                      {implementationPreview.industry && (
                        <CardDescription className="mt-2 text-xs">
                          Industry: {implementationPreview.industry}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCancel}
                      disabled={deleteImplementationMutation.isPending}
                      data-testid="button-cancel-implementation"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-accent/30 rounded-md p-3 border border-accent/50">
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Why This Project?</h4>
                    <p className="text-sm leading-relaxed text-foreground">
                      {implementationPreview.whySuggested || "This project aligns with your learning to build practical, real-world problem-solving skills."}
                    </p>
                  </div>

                  {implementationPreview.problemAddressed && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Problem Addressed</h4>
                      <p className="text-sm leading-relaxed text-foreground">{implementationPreview.problemAddressed}</p>
                    </div>
                  )}

                  {implementationPreview.realWorldContext && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Where You'll Apply It</h4>
                      <p className="text-sm leading-relaxed text-foreground">{implementationPreview.realWorldContext}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <h4 className="text-sm font-semibold mb-2">Components</h4>
                    {implementationPreview.components && implementationPreview.components.length > 0 ? (
                      <ul className="space-y-1">
                        {implementationPreview.components.map((component, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{component}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Components will be defined during implementation</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Learning Goals</h4>
                    {implementationPreview.learningGoals && implementationPreview.learningGoals.length > 0 ? (
                      <ul className="space-y-1">
                        {implementationPreview.learningGoals.map((goal, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Learning objectives will be defined during implementation</p>
                    )}
                  </div>

                  {!showReadinessAssessment && (
                    <div className="pt-4 border-t">
                      {showPreferenceChat ? (
                        <ProjectPreferenceChat
                          conceptTitle={title}
                          conceptCategory={category}
                          onGenerate={handlePreferenceGenerate}
                          onCancel={() => setShowPreferenceChat(false)}
                        />
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          {implementationPreview ? (
                            <Button
                              size="sm"
                              onClick={() => setShowReadinessAssessment(true)}
                              className="flex-1 text-xs h-8"
                              data-testid="button-toggle-readiness"
                            >
                              Check Readiness
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => setShowReadinessAssessment(true)}
                              className="flex-1 text-xs h-8"
                              data-testid="button-proceed-project"
                            >
                              How Ready Am I?
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateNew}
                            disabled={generateImplementationMutation.isPending || isRegenerating}
                            data-testid="button-generate-new-implementation"
                          >
                            {(generateImplementationMutation.isPending || isRegenerating) ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isRegenerating ? "Regenerating..." : "Generating..."}
                              </>
                            ) : (
                              "Generate New Project"
                            )}
                          </Button>
                          {implementationPreview && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleProceed}
                              data-testid="button-proceed-project"
                            >
                              Proceed to Project →
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {showReadinessAssessment && implementationPreview && (
                <div className="mt-6 pt-6 border-t">
                  <SmartReadiness
                    conceptTitle={title}
                    conceptCategory={category}
                    prerequisites={generatePrerequisitesFromImplementation()}
                    hasOpportunityProject={!!implementationPreview}
                    onClaimKnowledge={(name: string) => console.log('Claimed knowledge:', name)}
                    onProceed={handleProceed}
                    onLearnPrerequisite={(name: string) => {
                      setLocation("/resources");
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
      {implementationPreview && chatOpen === false && messages.length > 0 && (
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={() => setChatOpen(true)}
            data-testid="button-continue-chatting"
          >
            Continue chatting...
          </Button>
        </div>
      )}
      {chatOpen && !collapsed && (
        <div className="mt-6 space-y-4">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm prose-sm relative group/msg",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="absolute -right-24 top-0 flex gap-1 opacity-100">
                      {currentlySpeakingChatId === msg.id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive transition-opacity"
                          onClick={handleStopChatSpeech}
                          data-testid={`button-stop-reading-chat-${msg.id}`}
                          title="Stop reading"
                        >
                          <Square className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleToggleChatSpeech(msg.id, msg.content)}
                          data-testid={`button-read-aloud-chat-${msg.id}`}
                          title="Read aloud"
                        >
                          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  )}
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p className="m-0" {...props} />,
                      ul: ({ node, ...props }) => <ul className="m-0 pl-4" {...props} />,
                      ol: ({ node, ...props }) => <ol className="m-0 pl-4" {...props} />,
                      li: ({ node, ...props }) => <li className="m-0" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                      em: ({ node, ...props }) => <em className="italic" {...props} />,
                      code: ({ children, inline, ...props }: any) => 
                        inline ? 
                          <code className="bg-black/20 px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code> :
                          <code className="block bg-black/20 p-2 rounded text-xs font-mono overflow-x-auto" {...props}>{children}</code>,
                      a: ({ node, ...props }) => <a className="underline" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            
            {hasClickedGenerate && !implementationPreview && (
              <div className="pt-4 border-t">
                <Button
                  onClick={handleGenerateImplementation}
                  disabled={generateImplementationMutation.isPending || !id}
                  data-testid="button-generate-implementation-chat"
                >
                  {generateImplementationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Implementation
                    </>
                  )}
                </Button>
                {conceptData?.latestImplementation && !implementationPreview && (
                  <Button
                    variant="outline"
                    className="ml-2"
                    onClick={() => {
                      setImplementationPreview(conceptData.latestImplementation);
                      setChatOpen(false);
                    }}
                    data-testid="button-show-past-implementation-chat"
                  >
                    Show Past Implementation
                  </Button>
                )}
              </div>
            )}
          </div>

          {lastFailedChatMessage && !sendMessageMutation.isPending && (
            <div className="flex justify-end pb-1">
              <button
                onClick={handleRetryChatMessage}
                className="flex items-center gap-1.5 text-xs text-destructive border border-destructive/30 rounded-full px-3 py-1 hover:bg-destructive/10 transition-colors"
                data-testid="button-retry-chat-message"
              >
                <RotateCcw className="h-3 w-3" />
                Request failed — retry
              </button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1 border-b-2 border-border focus-within:border-primary transition-colors">
              <textarea
                placeholder="Ask follow-up..."
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full resize-none bg-transparent border-0 focus:outline-none text-sm p-0 placeholder:text-muted-foreground placeholder:italic placeholder:text-right min-h-[60px]"
                data-testid="input-chat-message"
              />
            </div>
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!userMessage.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {!hasClickedGenerate && !implementationPreview && (
            <div className="pt-4 flex gap-2 items-center">
              <Button
                onClick={handleGenerateImplementation}
                disabled={generateImplementationMutation.isPending || !id}
                data-testid="button-generate-implementation"
              >
                {generateImplementationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Implementation
                  </>
                )}
              </Button>
              {conceptData?.latestImplementation && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setImplementationPreview(conceptData.latestImplementation);
                    setChatOpen(false);
                  }}
                  data-testid="button-show-past-implementation-bottom"
                >
                  Show Past Implementation
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      <GenerationProgressDialog
        open={generateImplementationMutation.isPending}
        steps={generationSteps}
      />
    </div>
  );
}
