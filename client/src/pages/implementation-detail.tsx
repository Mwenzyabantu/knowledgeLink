import { useState, useEffect, useRef, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Download, 
  Code2, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Star,
  Trash2,
  Workflow,
  Layout
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { GenerationProgressDialog, type GenerationStep } from "@/components/generation-progress-dialog";
import { InstructionsDisplay } from "@/components/instructions-display";
import type { ChatSession, ChatMessage, Implementation, UserPersonalization } from "@shared/schema";
import mermaid from "mermaid";
import ReactFlow, { Background, Controls, Handle, Position } from 'react-flow-renderer';

// Add a custom node for better styling
const FlowNode = ({ data }: { data: { label: string } }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-card border-2 border-primary text-sm font-medium text-center min-w-[120px] relative group overflow-visible">
    <div className="drag-handle absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 cursor-move transition-opacity flex items-center justify-center z-10">
      <Layout className="w-2 h-2 text-primary-foreground" />
    </div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary border-none z-20" style={{ visibility: 'visible', top: 0 }} />
    <div className="py-1">{data.label}</div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary border-none z-20" style={{ visibility: 'visible', bottom: 0 }} />
  </div>
);

const nodeTypes = {
  custom: FlowNode,
};

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'default', // Using default and then overriding with theme variables
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  }
});

const MermaidDiagram = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { data: personalization } = useQuery<UserPersonalization>({
    queryKey: ["/api/personalization"],
  });

  const isDarkMode = personalization?.theme === 'dark';

  useEffect(() => {
    let isMounted = true;
    if (ref.current && chart) {
      const renderMermaid = async () => {
        try {
          setError(null);
          
          // Re-initialize for theme support
          mermaid.initialize({
            startOnLoad: false,
            theme: isDarkMode ? 'dark' : 'default',
            themeVariables: isDarkMode ? {
              primaryColor: '#3b82f6',
              primaryTextColor: '#f8fafc',
              primaryBorderColor: '#1e40af',
              lineColor: '#94a3b8',
              secondaryColor: '#1e293b',
              tertiaryColor: '#0f172a'
            } : {
              primaryColor: '#2563eb',
              primaryTextColor: '#0f172a',
              primaryBorderColor: '#3b82f6',
              lineColor: '#64748b',
              secondaryColor: '#f1f5f9',
              tertiaryColor: '#f8fafc'
            }
          });

          // CRITICAL: Sanitize and format the chart text for Mermaid
          let processedChart = chart.trim();
          
          // Remove markdown code fences if present
          processedChart = processedChart.replace(/^```mermaid\s+/i, "").replace(/\s+```$/i, "");
          
          // Remove mermaid["..."] wrapper if present
          const wrapperMatch = processedChart.match(/^mermaid\["([\s\S]*)"\]$/i);
          if (wrapperMatch) {
            processedChart = wrapperMatch[1];
          }

          // Basic validation/fixing
          if (!processedChart.includes('graph ') && !processedChart.includes('flowchart ') && !processedChart.includes('sequenceDiagram')) {
            processedChart = `graph TD\n${processedChart}`;
          }

          // Remove semicolons and braces that break Mermaid parsing (common in AI output)
          processedChart = processedChart.replace(/;\s*$/gm, '');
          processedChart = processedChart.replace(/\{\s*$/gm, '');

          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg: renderedSvg } = await mermaid.render(id, processedChart);
          if (isMounted) {
            setSvg(renderedSvg);
          }
        } catch (e: any) {
          console.error("Mermaid rendering error:", e);
          if (isMounted) {
            setError(e.message || "Failed to render Mermaid diagram");
          }
        }
      };
      renderMermaid();
    }
    return () => { isMounted = false; };
  }, [chart, isDarkMode]);

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-destructive/10 text-destructive text-sm font-mono whitespace-pre-wrap overflow-auto max-h-[300px]">
        <p className="font-bold mb-2">Mermaid Rendering Error:</p>
        <p className="text-xs mb-4 opacity-80">The AI generated an invalid diagram. Attempting to display as text instead.</p>
        <div className="mt-4 pt-4 border-t border-destructive/20 text-muted-foreground">
          <p className="font-bold mb-1">Raw Diagram Content:</p>
          <pre className="text-xs bg-muted p-2 rounded">{chart}</pre>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "mermaid flex justify-center p-4 rounded-lg border overflow-x-auto min-h-[300px]",
        isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
      )}
      ref={ref}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

const FlowChart = ({ diagram }: { diagram: string }) => {
  const { nodes, edges } = useMemo(() => {
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeIds = new Set();
    let yOffset = 50;

    // Split by newlines and filter out empty lines or mermaid headers
    const lines = diagram.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('graph') && !l.startsWith('flowchart'));

    lines.forEach((line) => {
      // Improved regex to handle various mermaid-like syntax
      // Matches: ID[Label] --> ID2[Label2]
      // Also matches nodes with arrows and text labels: ID[Label] -- Text --> ID2[Label2]
      const connectionMatch = line.match(/(\w+)(?:\[(.*?)\])?\s*--(?:\s*(.*?)\s*)?-->\s*(\w+)(?:\[(.*?)\])?/);
      
      if (connectionMatch) {
        const [, sourceId, sourceLabel, edgeLabel, targetId, targetLabel] = connectionMatch;
        
    const processNode = (id: string, label: string | undefined, x: number) => {
      if (!nodeIds.has(id)) {
        nodes.push({
          id,
          type: 'custom',
          data: { label: label || id },
          position: { x, y: yOffset },
        });
        nodeIds.add(id);
        yOffset += 120; // Increased spacing for better visibility
      }
    };

        processNode(sourceId, sourceLabel, 250);
        processNode(targetId, targetLabel, 250);

        edges.push({
          id: `e-${sourceId}-${targetId}-${Math.random()}`,
          source: sourceId,
          target: targetId,
          label: edgeLabel,
          animated: true,
          style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
          markerEnd: {
            type: 'arrowclosed',
            color: 'hsl(var(--primary))',
          },
        });
      } else {
        // Handle single nodes: ID[Label]
        const nodeMatch = line.match(/(\w+)\[(.*?)\]/);
        if (nodeMatch) {
          const [, id, label] = nodeMatch;
          if (!nodeIds.has(id)) {
            nodes.push({
              id,
              type: 'custom',
              data: { label },
              position: { x: 250, y: yOffset },
            });
            nodeIds.add(id);
            yOffset += 80;
          }
        }
      }
    });

    return { nodes, edges };
  }, [diagram]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] border rounded-lg bg-muted/20 text-muted-foreground text-sm italic">
        No valid flowchart data found in diagram
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full border rounded-lg bg-card overflow-hidden relative">
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default function ImplementationDetail() {
  const [, params] = useRoute("/implementation/:id");
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [showConversionOptions, setShowConversionOptions] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [toolSuggestions, setToolSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [excludedTools, setExcludedTools] = useState<string[]>([]);
  const [customTool, setCustomTool] = useState("");
  const [activeTab, setActiveTab] = useState("instructions");
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const implementationId = params?.id ? parseInt(params.id) : null;

  // Fetch versions
  const { data: versions = [], refetch: refetchVersions } = useQuery<Implementation[]>({
    queryKey: implementationId ? [`/api/implementations/${implementationId}/versions`] : [],
    enabled: !!implementationId,
  });

  // Fetch implementation data
  const { data: implementation, isLoading: isLoadingImplementation, refetch: refetchImplementation } = useQuery<Implementation>({
    queryKey: implementationId ? [`/api/implementations/${implementationId}`] : [],
    enabled: !!implementationId,
  });

  // Fetch chat session
  const { data: chatSession } = useQuery<ChatSession | null>({
    queryKey: implementationId ? [`/api/implementations/${implementationId}/chat-session`] : [],
    enabled: !!implementationId,
  });

  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { id: 'gemini', label: 'Gemini AI analyzing project structure', status: 'pending' },
    { id: 'groq', label: 'Groq AI generating detailed instructions', status: 'pending' },
    { id: 'thinking', label: 'AI thinking through best practices', status: 'pending' },
    { id: 'compile', label: 'Compiling comprehensive guide', status: 'pending' },
  ]);
  const [generationDetails, setGenerationDetails] = useState<string[]>([]);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [surveyPage, setSurveyPage] = useState(1);
  const [surveyData, setSurveyData] = useState({
    difficultyRating: 3,
    enjoymentRating: 3,
    metObjectives: [] as string[],
    learntSkills: [] as string[],
    feedbackText: "",
    outcomeMatches: true
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [otherDeleteReason, setOtherDeleteReason] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chat messages
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: sessionId ? [`/api/chat-sessions/${sessionId}/messages`] : [],
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (chatSession) {
      setSessionId(chatSession.id);
    }
  }, [chatSession]);

  // Track access and set status to "in progress"
  useEffect(() => {
    if (implementationId) {
      apiRequest("PATCH", `/api/implementations/${implementationId}/access`, {});
      // Set status to "in progress" when user reaches implementation page
      apiRequest("PATCH", `/api/implementations/${implementationId}`, { status: "in progress" });
    }
  }, [implementationId]);

  const deleteProjectMutation = useMutation({
    mutationFn: async (reason: string) => {
      // First, track the interaction
      await apiRequest("POST", "/api/project-interactions", {
        projectId: implementationId,
        action: "deleted",
        metadata: { reason }
      });
      // Then delete the implementation
      await apiRequest("DELETE", `/api/implementations/${implementationId}`);
    },
    onSuccess: () => {
      toast({
        title: "Project Deleted",
        description: "The project has been removed. We'll use your feedback to improve future suggestions.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });
      setLocation("/projects");
    },
  });

  const handleDeleteProject = () => {
    const finalReason = deleteReason === "other" ? otherDeleteReason : deleteReason;
    if (!finalReason) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for deleting this project.",
        variant: "destructive"
      });
      return;
    }
    deleteProjectMutation.mutate(finalReason);
  };

  const generateFullImplementation = async () => {
    if (!implementationId) return;
    // Generation now handled by GenerationStatusPage component on implementation-preview.tsx
    // This method is kept for potential future use
    setIsGenerating(false);
  };

  // Simulate loading progress
  useEffect(() => {
    if (!isLoadingImplementation && implementation) {
      return;
    }
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + 15;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isLoadingImplementation, implementation]);

  useEffect(() => {
    if (implementation && progress < 100) {
      setProgress(100);
    }
  }, [implementation, progress]);

  // Parse instructions to add explanatory "why" text for each step
  const parseInstructionsWithExplanations = (instructionsText: string): Array<{ step: string; why: string }> => {
    if (!instructionsText) return [];
    
    const lines = instructionsText.split('\n');
    const steps: Array<{ step: string; why: string }> = [];
    let currentStep = '';
    let currentWhy = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect step headers (lines starting with number followed by period or dot)
      if (/^\d+[\.\)]/.test(trimmed)) {
        // Save previous step if exists
        if (currentStep) {
          steps.push({ step: currentStep, why: currentWhy.trim() });
        }
        currentStep = trimmed;
        currentWhy = '';
      } else if (trimmed && currentStep) {
        // Add explanation lines
        if (currentWhy) {
          currentWhy += ' ' + trimmed;
        } else {
          currentWhy = trimmed;
        }
      }
    }
    
    // Add last step
    if (currentStep) {
      steps.push({ step: currentStep, why: currentWhy.trim() });
    }
    
    return steps;
  };

  const handleDownload = () => {
    if (!implementation?.code) return;
    const blob = new Blob([implementation.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${implementation.projectName.toLowerCase().replace(/\s+/g, "_")}.${implementation.language.toLowerCase().includes("python") ? "py" : implementation.language.toLowerCase().includes("javascript") ? "js" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chat-sessions", {
        type: "project_support",
        projectId: implementationId,
        tags: ["implementation", "support"],
        isCollapsed: false,
      });
      return await res.json();
    },
    onSuccess: (newSession: ChatSession) => {
      setSessionId(newSession.id);
      if (implementationId) {
        queryClient.invalidateQueries({ queryKey: [`/api/implementations/${implementationId}/chat-session`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      let currentSessionId = sessionId;
      
      if (!currentSessionId) {
        const session = await createSessionMutation.mutateAsync();
        currentSessionId = session.id;
      }

      const userMsgRes = await apiRequest("POST", `/api/chat-sessions/${currentSessionId}/messages`, {
        role: "user",
        content: message,
      });
      await userMsgRes.json();

      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
      const projectContext = `Project: ${implementation?.projectName}\nTool: ${implementation?.tool}\nLanguage: ${implementation?.language}\n\nProblem: ${implementation?.problemAddressed}\n\nCode:\n${implementation?.code}`;

      const aiRes = await apiRequest("POST", "/api/ai/chat-response", {
        userMessage: message,
        conversationHistory,
        conceptContext: projectContext,
      });
      const { response } = await aiRes.json();

      const aiMsgRes = await apiRequest("POST", `/api/chat-sessions/${currentSessionId}/messages`, {
        role: "assistant",
        content: response,
      });
      await aiMsgRes.json();

      return { sessionId: currentSessionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat-sessions/${data.sessionId}/messages`] });
      setUserMessage("");
    },
  });

  const handleSendMessage = () => {
    if (!userMessage.trim()) return;
    sendMessageMutation.mutate(userMessage);
  };

  const handleConvertTo = async (language: string) => {
    if (!implementationId || isConverting) return;
    
    setIsConverting(true);
    try {
      const res = await apiRequest("POST", `/api/implementations/${implementationId}/convert`, {
        targetLanguage: language
      });
      const updated = await res.json();
      
      toast({
        title: "Project Converted",
        description: `Successfully converted project to ${language}`,
      });
      
      // Invalidate queries to update version history
      queryClient.invalidateQueries({ queryKey: [`/api/implementations/${implementationId}/versions`] });
      queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });

      if (updated.id !== implementationId) {
        setLocation(`/implementation/${updated.id}`);
      } else {
        refetchImplementation();
        refetchVersions();
      }
      
      setShowConversionOptions(false);
    } catch (error) {
      console.error("Project conversion failed:", error);
      toast({
        title: "Conversion Failed",
        description: "Failed to convert project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
    }
  };

  const fetchSuggestions = async (refresh = false, toolsToExclude = excludedTools) => {
    if (!implementationId || isLoadingSuggestions) return;
    if (!refresh && toolSuggestions.length > 0) return;
    
    if (refresh) setToolSuggestions([]);
    setSuggestionsError(null);
    setIsLoadingSuggestions(true);

    try {
      const params = new URLSearchParams();
      if (toolsToExclude.length > 0) {
        params.set("excluded", toolsToExclude.join(","));
      }
      const query = params.toString();
      const url = `/api/implementations/${implementationId}/suggestions${query ? `?${query}` : ""}`;
      const res = await apiRequest("GET", url);
      const data = await res.json();
      if (!Array.isArray(data) || !data.every((tool) => typeof tool === "string")) {
        throw new Error("The alternatives response was not a list of tool names.");
      }
      setToolSuggestions(data);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestionsError("Could not load alternatives. Try again or enter a tool below.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleCustomToolConvert = async () => {
    if (!customTool.trim() || !implementationId) return;
    
    setIsValidating(true);
    try {
      const valRes = await apiRequest("POST", `/api/implementations/${implementationId}/validate-tool`, {
        tool: customTool
      });
      const validation = await valRes.json();
      
      if (!validation.valid) {
        toast({
          title: "Tool Suggestion",
          description: validation.reason || "This tool might not be the best fit for this project. Would you like to try something else?",
          variant: "default",
          className: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100",
        });
        return;
      }

      await handleConvertTo(customTool);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate tool. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleFindMoreAlternatives = () => {
    const newExcluded = Array.from(new Set([...excludedTools, ...toolSuggestions]));
    setExcludedTools(newExcluded);
    fetchSuggestions(true, newExcluded);
  };

  useEffect(() => {
    if (showConversionOptions) {
      fetchSuggestions();
    }
  }, [showConversionOptions]);

  // Mutation to mark project as completed
  const markCompletedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/implementations/${implementationId}/complete`, {
        feedback: surveyData,
        masteredPrerequisites: surveyData.learntSkills
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setShowCompletionDialog(false);
      queryClient.invalidateQueries({ queryKey: implementationId ? [`/api/implementations/${implementationId}`] : [] });
      queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });
      toast({
        title: "Project Completed",
        description: "Congratulations on finishing the project! Your progress has been saved.",
      });
      
      // Redirect to projects page with the completed tab and specific project in view
      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        setLocation("/projects?tab=completed");
      }
    },
  });

  const extractPrerequisitesFromInstructions = (instructions: string): string[] => {
    const lines = instructions.split('\n');
    const prerequisites: string[] = [];
    
    // Look for prerequisite sections or patterns
    let inPrerequisiteSection = false;
    for (const line of lines) {
      const trimmed = line.toLowerCase();
      
      if (trimmed.includes('prerequisite') || trimmed.includes('before you begin') || trimmed.includes('required knowledge')) {
        inPrerequisiteSection = true;
        continue;
      }
      
      if (inPrerequisiteSection && trimmed.trim()) {
        if (/^\d+\.|^-|^•/.test(trimmed)) {
          // Extract the text without the bullet/number
          const text = trimmed.replace(/^[\d+\.|-|•]\s*/, '').trim();
          if (text && text.length > 0) {
            prerequisites.push(text);
          }
        } else if (trimmed.includes('step') || trimmed.includes('install') || trimmed === '---') {
          inPrerequisiteSection = false;
        }
      }
    }
    
    return prerequisites.length > 0 ? prerequisites : ['Basic understanding of the concept', 'Environment setup', 'Required libraries'];
  };

  if (isLoadingImplementation) {
    const displayImplementation = implementation as Implementation | undefined;
    return (
      <div className="max-w-4xl mx-auto">
        <div className="py-6 text-center space-y-6">
          <div className="flex flex-col items-center gap-4 mb-8">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <div>
              <h1 className="text-2xl font-semibold">Preparing Implementation</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Please wait while we are creating a <span className="font-semibold text-foreground">'{displayImplementation?.projectName || "project"}'</span> project implementation for you in <span className="text-orange-500 font-medium">{displayImplementation?.tool || "your tool"}</span>...
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-md mx-auto">
            <Progress value={progress} className="h-2 w-full" data-testid="progress-generation" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {progress < 40 && "Fetching project details..."}
              {progress >= 40 && progress < 70 && "Loading code and documentation..."}
              {progress >= 70 && progress < 100 && "Preparing your workspace..."}
              {progress === 100 && "Ready!"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!implementation) {
    return (
      <div className="max-w-4xl mx-auto py-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Project not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const instructionSteps = parseInstructionsWithExplanations(implementation.instructions || "");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="py-6 space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-6"
            data-testid="button-back-to-home"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div className="flex items-start gap-3">
              <Code2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{implementation.projectName}</h1>
                  <Badge variant="outline" className="ml-2">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Project Ready
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {implementation.type} • {implementation.tool} ({implementation.language})
                </p>
                {implementation.industry && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Industry: {implementation.industry}
                  </p>
                )}
              </div>
            </div>
            {implementation.code && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                data-testid="button-download"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Code
              </Button>
            )}
          </div>
        </div>

        {/* Project Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {implementation.problemAddressed && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Problem Being Solved</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {implementation.problemAddressed}
                </p>
              </div>
            )}
            {implementation.realWorldContext && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Real-World Application</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {implementation.realWorldContext}
                </p>
              </div>
            )}
            {implementation.whySuggested && (
              <div className="bg-accent/30 rounded-md p-3 border border-accent/50">
                <h4 className="text-sm font-semibold mb-1">Why This Project?</h4>
                <p className="text-sm leading-relaxed">
                  {implementation.whySuggested}
                </p>
              </div>
            )}
            {implementation.learningGoals && implementation.learningGoals.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Learning Goals</h4>
                <ul className="space-y-1">
                  {implementation.learningGoals.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {implementation.components && implementation.components.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Components & Tools</h4>
                <ul className="space-y-1">
                  {implementation.components.map((component, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{component}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b">
            <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger value="instructions" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap" data-testid="tab-instructions">How to Build</TabsTrigger>
              <TabsTrigger value="code" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap" data-testid="tab-code">Code</TabsTrigger>
              <TabsTrigger value="pseudocode" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap" data-testid="tab-pseudocode">Algorithm</TabsTrigger>
              {implementation.flowDiagram && (
                <TabsTrigger value="flow" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap" data-testid="tab-flow">Flow Chart</TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="instructions" className="mt-6 space-y-6">
            <div className="text-sm text-muted-foreground">
              Follow these steps in order to build your project. Each step includes an explanation of <strong>why</strong> you're doing it.
            </div>
            {implementation.instructions ? (
              <div className="space-y-6">
                <InstructionsDisplay instructions={implementation.instructions} />
                <div className="border-t pt-6">
                  <Button
                    onClick={() => setShowCompletionDialog(true)}
                    disabled={implementation.status === "completed" || markCompletedMutation.isPending}
                    data-testid="button-mark-completed"
                  >
                    {markCompletedMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Marking as Complete...
                      </>
                    ) : implementation.status === "completed" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                        Project Completed
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark as Completed Project
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border rounded-md bg-yellow-950/20 border-yellow-700/50">
                <p className="text-sm text-muted-foreground mb-4">
                  Instructions are being generated by our AI system. 
                </p>
                <p className="text-xs text-muted-foreground">
                  This content will appear here once generation completes. Check the Code or Algorithm tabs in the meantime.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <div className="border rounded-md bg-muted/50">
              <pre className="p-4 overflow-x-auto">
                <code className="text-sm font-mono">{implementation.code || "Code not available"}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="pseudocode" className="mt-4">
            <div className="border rounded-md bg-muted/50">
              <pre className="p-4 overflow-x-auto">
                <code className="text-sm font-mono">{implementation.pseudocode || "Algorithm not available"}</code>
              </pre>
            </div>
          </TabsContent>

          {implementation.flowDiagram && (
            <TabsContent value="flow" className="mt-4">
              {activeTab === "flow" && <FlowChart diagram={implementation.flowDiagram} />}
            </TabsContent>
          )}
        </Tabs>

        {/* Support Section */}
        <div className="border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Questions about this project?</h2>
          </div>

          {chatOpen && messages.length > 0 && (
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChatCollapsed(!chatCollapsed)}
                className="-ml-3"
                data-testid="button-toggle-chat"
              >
                {chatCollapsed ? (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Show Conversation
                  </>
                ) : (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Hide Conversation
                  </>
                )}
              </Button>
            </div>
          )}

          {chatOpen && !chatCollapsed && messages.length > 0 && (
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm prose-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                    data-testid={`support-message-${index}`}
                  >
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className="m-0" {...props} />,
                        ul: ({ node, ...props }) => <ul className="m-0 pl-4" {...props} />,
                        li: ({ node, ...props }) => <li className="m-0" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isConverting ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-2 w-2 bg-primary rounded-full animate-ping" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium">Preparing Implementation</h3>
                <p className="text-sm text-muted-foreground italic">
                  Please wait while we are creating a <span className="font-bold text-foreground">'{implementation.projectName}'</span> project implementation for you in <span className="font-bold text-foreground text-primary">{implementation.language}</span>...
                </p>
              </div>
            </div>
          ) : !showConversionOptions ? (
            <div className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1 border-b-2 border-border focus-within:border-primary transition-colors">
                  <textarea
                    placeholder={chatOpen ? "Ask follow-up..." : "Ask a question about the project..."}
                    value={userMessage}
                    onChange={(e) => {
                      setUserMessage(e.target.value);
                      if (!chatOpen) setChatOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="w-full resize-none bg-transparent border-0 focus:outline-none text-sm p-0 placeholder:text-muted-foreground placeholder:italic min-h-[60px]"
                    data-testid="input-support-chat"
                  />
                </div>
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!userMessage.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-support"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {implementation.code && (
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => setShowConversionOptions(true)}
                    data-testid="button-convert-tool"
                  >
                    Convert to Different Tool
                  </Button>
                  
                  {implementation && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 bg-green-500/10 px-2 py-1 rounded-md border border-green-600/30">
                        <span className="text-xs font-medium text-green-600">Current: {implementation.tool}</span>
                      </div>
                      
                      {versions.length > 1 && (
                        <div className="flex items-center gap-2 bg-[#7c2d12]/10 px-2 py-1 rounded-md border border-[#7c2d12]/30">
                          <span className="text-xs font-medium text-[#7c2d12]">Past:</span>
                          <div className="flex gap-1 flex-wrap">
                            {Array.from(new Map(versions
                              .filter(v => v.id !== implementation.id)
                              .map(v => [v.tool, v]))
                              .values())
                              .sort((a, b) => b.version - a.version)
                              .map((v) => (
                                <Badge 
                                  key={v.id} 
                                  variant="outline" 
                                  className="text-[10px] px-1.5 py-0 cursor-pointer border-[#7c2d12]/30 bg-[#7c2d12]/5 text-[#7c2d12] hover:bg-[#7c2d12]/10 no-default-hover-elevate"
                                  onClick={() => setLocation(`/implementation/${v.id}`)}
                                >
                                  {v.tool}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="flex-1" />

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setShowDeleteDialog(true)}
                              data-testid="button-delete-project"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Project</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Convert project from {implementation.tool} ({implementation.language}) to:</p>
                <div className="flex gap-2 flex-wrap min-h-8">
                  {toolSuggestions.length > 0 ? (
                    toolSuggestions.map((tool) => (
                      <Badge
                        key={tool}
                        className="cursor-pointer hover-elevate px-3 py-1.5"
                        onClick={() => handleConvertTo(tool)}
                        data-testid={`badge-convert-${tool.toLowerCase()}`}
                      >
                        {tool}
                      </Badge>
                    ))
                  ) : isLoadingSuggestions ? (
                    <div className="flex items-center text-xs text-muted-foreground animate-pulse">
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Analyzing project for alternatives...
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground" role={suggestionsError ? "alert" : undefined}>
                      {suggestionsError || "No alternatives found. Enter a tool below or try again."}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-primary hover:bg-transparent"
                    onClick={handleFindMoreAlternatives}
                    disabled={isLoadingSuggestions}
                  >
                    {suggestionsError ? "Retry alternatives" : "Find other alternatives"}
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Do not have these tools? WE'VE GOT YOU COVERED.</p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Enter the tool or language you have or know..."
                        value={customTool}
                        onChange={(e) => setCustomTool(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleCustomToolConvert();
                        }}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Tell us which tool you prefer, and we will translate the project for you.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleCustomToolConvert}
                      disabled={!customTool.trim() || isValidating || isConverting}
                    >
                      {isValidating || isConverting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Convert"
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConversionOptions(false)}
                  data-testid="button-cancel-conversion"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Project Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription>
                We're sorry to see you go! Please tell us why you'd like to delete this project so we can improve our suggestions for you.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <RadioGroup value={deleteReason} onValueChange={setDeleteReason}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="too-easy" id="too-easy" />
                  <Label htmlFor="too-easy">Too easy / I already know this</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="too-hard" id="too-hard" />
                  <Label htmlFor="too-hard">Too difficult / Don't have the prerequisites</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not-interested" id="not-interested" />
                  <Label htmlFor="not-interested">Not interested in this topic</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="wrong-tool" id="wrong-tool" />
                  <Label htmlFor="wrong-tool">Tool/Language choice isn't right for me</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other reason</Label>
                </div>
              </RadioGroup>

              {deleteReason === "other" && (
                <Textarea
                  placeholder="Please specify..."
                  value={otherDeleteReason}
                  onChange={(e) => setOtherDeleteReason(e.target.value)}
                  className="mt-2"
                />
              )}
              
              <p className="text-xs text-muted-foreground italic">
                Note: Deleting this project will remove it from your dashboard. We'll use this feedback to better understand your interests.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteProject}
                disabled={deleteProjectMutation.isPending || !deleteReason || (deleteReason === 'other' && !otherDeleteReason)}
              >
                {deleteProjectMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Project"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Completion Dialog */}
        <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {surveyPage === 1 ? "Objectives & Learning" : 
                 surveyPage === 2 ? "Experience & Reflection" : 
                 "Final Submission"}
              </DialogTitle>
              <DialogDescription>
                {surveyPage === 1 ? "Select which objectives you met and skills you mastered." :
                 surveyPage === 2 ? "Tell us about your experience with this project." :
                 "You're all set! Confirm to complete the project."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
              {surveyPage === 1 && (
                <>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Objectives Met</h4>
                    {implementation?.learningGoals?.map((goal, index) => (
                      <div key={`goal-${index}`} className="flex items-start gap-3">
                        <Checkbox
                          id={`goal-${index}`}
                          checked={surveyData.metObjectives.includes(goal)}
                          onCheckedChange={(checked) => {
                            setSurveyData(prev => ({
                              ...prev,
                              metObjectives: checked 
                                ? [...prev.metObjectives, goal]
                                : prev.metObjectives.filter(g => g !== goal)
                            }));
                          }}
                        />
                        <label htmlFor={`goal-${index}`} className="text-sm cursor-pointer">{goal}</label>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Skills Mastered (Prerequisites)</h4>
                    {extractPrerequisitesFromInstructions(implementation?.instructions || "").map((prereq, index) => (
                      <div key={`prereq-${index}`} className="flex items-start gap-3">
                        <Checkbox
                          id={`prereq-${index}`}
                          checked={surveyData.learntSkills.includes(prereq)}
                          onCheckedChange={(checked) => {
                            setSurveyData(prev => ({
                              ...prev,
                              learntSkills: checked 
                                ? [...prev.learntSkills, prereq]
                                : prev.learntSkills.filter(s => s !== prereq)
                            }));
                          }}
                        />
                        <label htmlFor={`prereq-${index}`} className="text-sm cursor-pointer">{prereq}</label>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {surveyPage === 2 && (
                <>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">I found the AI's suggestions helpful for my skill level</h4>
                    <RadioGroup 
                      value={surveyData.difficultyRating.toString()} 
                      onValueChange={(v) => setSurveyData(prev => ({ ...prev, difficultyRating: parseInt(v) }))}
                      className="flex flex-col gap-2"
                    >
                      {[1, 2, 3, 4, 5].map((val) => (
                        <div key={val} className="flex items-center gap-2">
                          <RadioGroupItem value={val.toString()} id={`diff-${val}`} />
                          <Label htmlFor={`diff-${val}`} className="text-sm font-normal cursor-pointer">
                            {val === 1 ? "Strongly Disagree" : val === 2 ? "Disagree" : val === 3 ? "Neutral" : val === 4 ? "Agree" : "Strongly Agree"}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">What was the most challenging part?</h4>
                    <Textarea 
                      placeholder="Share your thoughts..."
                      value={surveyData.feedbackText}
                      onChange={(e) => setSurveyData(prev => ({ ...prev, feedbackText: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {surveyPage === 3 && (
                <div className="text-center py-8">
                  <div className="mb-4 flex justify-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Thank you for your reflection! Marking this project as complete will also update all variations of this project.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
              <div>
                {surveyPage > 1 && (
                  <Button variant="ghost" onClick={() => setSurveyPage(p => p - 1)}>
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCompletionDialog(false)}>
                  Cancel
                </Button>
                {surveyPage < 3 ? (
                  <Button onClick={() => setSurveyPage(p => p + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={() => markCompletedMutation.mutate()}
                    disabled={markCompletedMutation.isPending}
                  >
                    {markCompletedMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      "Confirm Completion"
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
