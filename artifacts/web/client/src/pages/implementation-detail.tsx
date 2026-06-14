import { useState, useEffect, useRef, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { localStorage } from "@/lib/services/localStorage";
import { generateChatResponse } from "@/lib/services/supabase";
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
  Layout,
  FileText,
  RefreshCw,
  AlertCircle
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
import { GenerationStatusPage } from "@/components/generation-status-page";
import { InstructionsDisplay } from "@/components/instructions-display";
import type { ChatSession, ChatMessage, Implementation, UserPersonalization, Resource } from "@shared/schema";
import mermaid from "mermaid";
import ReactFlow, { Background, Controls, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';

type NodeShape = 'terminal' | 'process' | 'decision' | 'io' | 'rounded';

// Detect shape from label heuristics
const detectShapeFromLabel = (label: string): NodeShape => {
  const l = label.toLowerCase();
  if (/\bstart\b|\bbegin\b|\bend\b|\bstop\b|\bfinish\b|\bterminate\b/.test(l)) return 'terminal';
  if (/\bif\b|\bdecision\b|\bcheck\b|\bvalid|\bwhether\b/.test(l)) return 'decision';
  if (/\binput\b|\boutput\b|\bdisplay\b|\bprint\b|\bshow\b|\bread\b|\bwrite\b|\benter\b/.test(l)) return 'io';
  return 'process';
};

// Parse a Mermaid node definition string like "[Label]", "([Label])", "{Label}", "[/Label/]"
const parseMermaidNodeDef = (raw: string | undefined, id: string): { label: string; shape: NodeShape } => {
  if (!raw) return { label: id, shape: detectShapeFromLabel(id) };
  const t = raw.trim();
  let shape: NodeShape = 'process';
  let label = id;

  if (/^\(\[(.+)\]\)$/.test(t) || /^\(\((.+)\)\)$/.test(t)) {
    // Terminal: ([...]) or ((...))
    label = t.replace(/^\(\[|\]\)$|^\(\(|\)\)$/g, '');
    shape = 'terminal';
  } else if (/^\((.+)\)$/.test(t)) {
    // Rounded rectangle: (...)
    label = t.slice(1, -1);
    shape = 'rounded';
  } else if (/^\{(.+)\}$/.test(t)) {
    // Diamond/Decision: {...}
    label = t.slice(1, -1);
    shape = 'decision';
  } else if (/^\[\/(.+)\/\]$/.test(t) || /^\[\/(.+)\\\]$/.test(t) || /^\[\\(.+)\/\]$/.test(t)) {
    // Parallelogram/IO: [/text/] or variants
    label = t.replace(/^\[[\\/]|[\\/]\]$/g, '');
    shape = 'io';
  } else if (/^\[(.+)\]$/.test(t)) {
    // Process rectangle: [...]
    label = t.slice(1, -1);
    shape = detectShapeFromLabel(label);
  } else {
    label = t;
    shape = detectShapeFromLabel(label);
  }

  return { label, shape };
};

// Renders the correct flowchart shape
const FlowNode = ({ data }: { data: { label: string; shape: NodeShape } }) => {
  const { label, shape } = data;

  const handles = (
    <>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background z-20" />
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background z-20" />
    </>
  );

  if (shape === 'terminal') {
    return (
      <div className="relative">
        {handles}
        <div className="px-6 py-2 bg-primary text-primary-foreground text-xs font-bold text-center rounded-full min-w-[110px] border-2 border-primary shadow-sm">
          {label}
        </div>
      </div>
    );
  }

  if (shape === 'decision') {
    return (
      <div className="relative flex items-center justify-center" style={{ width: 150, height: 75 }}>
        {handles}
        <div
          className="absolute inset-0 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500"
          style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
        />
        <div className="relative z-10 text-[11px] font-semibold text-center px-8 text-amber-800 dark:text-amber-200 leading-tight">
          {label}
        </div>
      </div>
    );
  }

  if (shape === 'io') {
    return (
      <div className="relative">
        {handles}
        <div
          className="px-8 py-2 bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-500 text-xs font-medium text-center min-w-[120px] text-blue-800 dark:text-blue-200"
          style={{ clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' }}
        >
          {label}
        </div>
      </div>
    );
  }

  if (shape === 'rounded') {
    return (
      <div className="relative">
        {handles}
        <div className="px-4 py-2 bg-card border-2 border-primary/60 text-xs font-medium text-center min-w-[110px] rounded-xl shadow-sm">
          {label}
        </div>
      </div>
    );
  }

  // Default: Process rectangle (sharp corners per flowchart standard)
  return (
    <div className="relative">
      {handles}
      <div className="px-4 py-2 bg-card border-2 border-primary text-xs font-medium text-center min-w-[110px] rounded-none shadow-sm">
        {label}
      </div>
    </div>
  );
};

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
    queryKey: ["/api/user-personalization"],
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

          // Handle common syntax issues - Mermaid is very picky about characters inside labels
          // We wrap label text in quotes if it contains special characters
          processedChart = processedChart.replace(/\[(.*?)\]/g, (match, label) => {
            if (/[<>{}()\[\]#;]/.test(label) && !label.startsWith('"')) {
              return `["${label.replace(/"/g, "'")}"]`;
            }
            return match;
          });

          // Basic validation/fixing
          if (!processedChart.includes('graph ') && !processedChart.includes('flowchart ') && !processedChart.includes('sequenceDiagram')) {
            if (processedChart.includes('-->') || processedChart.includes('---')) {
              processedChart = `graph TD\n${processedChart}`;
            } else {
              processedChart = `graph TD\n  Start([${processedChart.substring(0, 50).replace(/[\[\]]/g, '')}])`;
            }
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

    // Helper: register or update a node (first occurrence wins for position)
    const processNode = (id: string, def: string | undefined) => {
      if (!nodeIds.has(id)) {
        const { label, shape } = parseMermaidNodeDef(def, id);
        nodes.push({
          id,
          type: 'custom',
          data: { label, shape },
          position: { x: 250, y: yOffset },
        });
        nodeIds.add(id);
        yOffset += 120;
      }
    };

    lines.forEach((line) => {
      // Connection regex — handles both plain --> and labelled -- text --> arrows.
      // Pattern breakdown:
      //   nodeId + optional bracket def + whitespace
      //   + arrow ( --> OR -- label --> OR -->|label| )
      //   + whitespace + nodeId + optional bracket def
      //
      // Node def alternatives: ([...]) | {...} | [...] each without their closing char inside
      const NODE_DEF = /(\([^\)]*\)|\{[^\}]*\}|\[[^\]]*\])/;
      const ARROW    = /(?:--([^-]*)-->|-->)(?:\|[^|]*\|)?/;
      const connRe   = new RegExp(
        `(\\w+)${NODE_DEF.source}?\\s*${ARROW.source}\\s*(\\w+)${NODE_DEF.source}?`
      );

      const connectionMatch = line.match(connRe);

      if (connectionMatch) {
        // Groups: 1=srcId, 2=srcDef, 3=edgeLabel(from -- lbl -->), 4=tgtId, 5=tgtDef
        const [, sourceId, sourceDef, edgeLabel, targetId, targetDef] = connectionMatch;

        processNode(sourceId, sourceDef);
        processNode(targetId, targetDef);

        edges.push({
          id: `e-${sourceId}-${targetId}-${Math.random()}`,
          source: sourceId,
          target: targetId,
          label: edgeLabel ? edgeLabel.trim() : undefined,
          animated: false,
          style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
          labelStyle: { fontSize: 11, fill: 'hsl(var(--foreground))' },
          labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.8 },
          markerEnd: {
            type: 'arrowclosed',
            color: 'hsl(var(--primary))',
          },
        });
      } else {
        // Standalone node line: ID([...]) or ID{...} or ID[...]
        const nodeMatch = line.match(/^(\w+)(\([^\)]*\)|\{[^\}]*\}|\[[^\]]*\])/);
        if (nodeMatch) {
          const [, id, def] = nodeMatch;
          processNode(id, def);
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
        nodesConnectable={false}
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
  const [excludedTools, setExcludedTools] = useState<string[]>([]);
  const [customTool, setCustomTool] = useState("");
  const [activeTab, setActiveTab] = useState("instructions");
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRegeneratingInstructions, setIsRegeneratingInstructions] = useState(false);
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

  // Fetch chat messages for the current session
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: sessionId ? [`/api/chat-sessions/${sessionId}/messages`] : [],
    enabled: !!sessionId,
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

  // Fetch resources
  const { data: resources = [], isLoading: isLoadingResources } = useQuery<Resource[]>({
    queryKey: implementationId ? [`/api/resources?projectId=${implementationId}`] : [],
    enabled: !!implementationId,
  });

  const fetchResourcesMutation = useMutation({
    mutationFn: async () => {
      if (!implementation) return;
      // Static: resources are local or generated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resources`, { projectId: implementationId }] });
    },
  });

  useEffect(() => {
    if (implementation && resources.length === 0 && !isLoadingResources && !fetchResourcesMutation.isPending) {
      fetchResourcesMutation.mutate();
    }
  }, [implementation, resources.length, isLoadingResources]);

  useEffect(() => {
    if (chatSession) {
      setSessionId(chatSession.id);
    }
  }, [chatSession]);

  useEffect(() => {
    if (showConversionOptions) {
      fetchSuggestions();
    }
  }, [showConversionOptions]);

  const extractPrerequisitesFromInstructions = (instructions: string): string[] => {
    const lines = instructions.split('\n');
    const prerequisites: string[] = [];
    let inPrerequisiteSection = false;

    for (const line of lines) {
      const trimmed = line.toLowerCase();
      if (trimmed.includes('prerequisite') || trimmed.includes('before you begin')) {
        inPrerequisiteSection = true;
        continue;
      }
      
      if (inPrerequisiteSection && trimmed.trim()) {
        if (/^\d+\.|^-|^•/.test(trimmed)) {
          const text = trimmed.replace(/^[\d+\.|-|•]\s*/, '').trim();
          prerequisites.push(text);
        } else if (trimmed.includes('step') || trimmed === '---') {
          inPrerequisiteSection = false;
        }
      }
    }
    return prerequisites.length > 0 ? prerequisites : ['Environment setup', 'Required libraries'];
  };

  // Track access and set status to "in progress"
  useEffect(() => {
    if (implementationId && implementation && implementation.status === 'preview') {
      // Static: no-op
    }
  }, [implementationId, implementation]);

  const deleteProjectMutation = useMutation({
    mutationFn: async (reason: string) => {
      // Static: delete from localStorage
      localStorage.projects.delete(implementationId?.toString() || "");
    },
    onSuccess: () => {
      toast({
        title: "Project Deleted",
        description: "The project has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/concepts"] });
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

  const handleDownloadReport = () => {
    if (!implementation) return;
    
    // Generate HTML content that can be opened in Word
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${implementation.projectName}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1e40af; margin-top: 20px; }
        .metadata { background: #f3f4f6; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        ul { margin-left: 20px; }
        pre { background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
      </style>
      </head>
      <body>
        <h1>Project Report: ${implementation.projectName}</h1>
        <div class="metadata">
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${implementation.status}</p>
          <p><strong>Tool/Language:</strong> ${implementation.tool} / ${implementation.language}</p>
        </div>

        <div class="section">
          <h2>Overview</h2>
          <p>${implementation.problemAddressed || "No overview provided."}</p>
        </div>

        <div class="section">
          <h2>Learning Goals</h2>
          <ul>
            ${implementation.learningGoals?.map(goal => `<li>${goal}</li>`).join('') || "<li>No learning goals specified.</li>"}
          </ul>
        </div>

        <div class="section">
          <h2>Expected Outcomes</h2>
          <ul>
            ${implementation.expectedOutcomes?.map(outcome => `<li>${outcome}</li>`).join('') || "<li>No outcomes specified.</li>"}
          </ul>
        </div>

        <div class="section">
          <h2>Instructions</h2>
          <div>${implementation.instructions?.replace(/\n/g, '<br>') || "Instructions not available."}</div>
        </div>

        <div class="section">
          <h2>Source Code</h2>
          <pre>${implementation.code || "Code not available."}</pre>
        </div>

        <p style="text-align: center; color: #666; font-size: 0.8em; margin-top: 50px;">
          Generated by Readiness Learning Platform
        </p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${implementation.projectName.toLowerCase().replace(/\s+/g, "_")}_report.doc`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Generated",
      description: "Your project report has been downloaded as a Word document.",
    });
  };

  const handleDownloadCode = () => {
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
      const session = localStorage.chats.add(implementation?.projectName || "Project", []);
      return session as unknown as ChatSession;
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

      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
      const projectContext = `Project: ${implementation?.projectName}\nTool: ${implementation?.tool}\nLanguage: ${implementation?.language}\n\nProblem: ${implementation?.problemAddressed}\n\nCode:\n${implementation?.code}`;

      const response = await generateChatResponse(message, conversationHistory, projectContext);

      return { sessionId: currentSessionId, response, userMessage: message };
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: data.userMessage || "", id: crypto.randomUUID() },
        { role: "assistant", content: data.response, id: crypto.randomUUID() },
      ]);
    },
  });

  const handleSendMessage = () => {
    if (!userMessage.trim()) return;
    sendMessageMutation.mutate(userMessage);
  };

  const handleConvertTo = async (language: string) => {
    if (!implementationId) return;
    setIsConverting(true);
    try {
      // Static: mock conversion
      toast({
        title: "Project Converted",
        description: `Successfully converted project to ${language}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/implementations/${implementationId}/versions`] });
      queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });
      setShowConversionOptions(false);
    } catch (error) {
      toast({
        title: "Conversion Failed",
        description: "Failed to convert project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
    }
  };

  const fetchSuggestions = async (refresh = false) => {
    if (!implementationId) return;
    if (!refresh && toolSuggestions.length > 0) return;
    
    // Clear current suggestions while fetching new ones
    if (refresh) setToolSuggestions([]);

    try {
      const excludedParam = excludedTools.join(",");
      const res = await fetch(`/api/implementations/${implementationId}/suggestions?excluded=${excludedParam}`);
      if (res.ok) {
        const data = await res.json();
        setToolSuggestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    }
  };

  const handleCustomToolConvert = async () => {
    if (!customTool.trim() || !implementationId) return;
    setIsValidating(true);
    try {
      // Static: always valid
      handleConvertTo(customTool);
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
    const newExcluded = [...excludedTools, ...toolSuggestions];
    setExcludedTools(newExcluded);
    fetchSuggestions(true);
  };

  useEffect(() => {
    if (showConversionOptions) {
      fetchSuggestions();
    }
  }, [showConversionOptions]);

  // Mutation to mark project as completed
  const markCompletedMutation = useMutation({
    mutationFn: async () => {
      // Static: update localStorage
      const projects = localStorage.projects.getAll();
      const updated = projects.map((p: any) =>
        p.id === implementationId ? { ...p, status: "completed" } : p
      );
      localStorage.projects.setAll(updated);
      return { success: true };
    },
    onSuccess: () => {
      setShowCompletionDialog(false);
      queryClient.invalidateQueries({ queryKey: implementationId ? [`/api/implementations/${implementationId}`] : [] });
      queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });
      toast({
        title: "Project Completed",
        description: "Congratulations on finishing the project! Your progress has been saved.",
      });
      window.location.href = "/projects?tab=completed";
    },
  });

  const regenerateFlowMutation = useMutation({
    mutationFn: async () => {
      // Static: no-op
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: implementationId ? [`/api/implementations/${implementationId}`] : [] });
      toast({ title: "Flow Chart regenerated", description: "The diagram has been updated." });
    },
    onError: () => {
      toast({ title: "Regeneration failed", description: "Could not generate the flow chart. Please try again.", variant: "destructive" });
    },
  });

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

  if (implementation.status === "failed") {
    const handleRetryGeneration = () => {
      // Static: no-op
      setIsRetrying(true);
    };

    if (isRetrying) {
      return (
        <GenerationStatusPage
          implementationId={implementation.id}
          onComplete={(newId) => {
            setIsRetrying(false);
            queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });
            setLocation(`/implementation/${newId || implementation.id}`);
          }}
          onCancel={() => {
            setIsRetrying(false);
          }}
        />
      );
    }

    return (
      <div className="max-w-4xl mx-auto py-6 space-y-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/projects")}
          data-testid="button-back-to-projects"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold">Generation Failed</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  The AI could not produce complete content for <span className="font-medium text-foreground">{implementation.projectName}</span>. This is usually caused by a temporary AI overload. Please try generating it again.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleRetryGeneration}
                data-testid="button-retry-generation"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Generation
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/projects")}
                data-testid="button-back-projects"
              >
                Back to Projects
              </Button>
            </div>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeleteDialog(true)}
                    data-testid="button-delete-project-header"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
              <div className="flex gap-2">
                {implementation.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadReport}
                    data-testid="button-download-report"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCode}
                  data-testid="button-download"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Code
                </Button>
              </div>
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
              <TabsTrigger value="code" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap" data-testid="tab-code">Code {implementation.language ? `(${implementation.language})` : ""}</TabsTrigger>
              <TabsTrigger value="pseudocode" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap" data-testid="tab-pseudocode">Algorithm</TabsTrigger>
              <TabsTrigger value="flow" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap" data-testid="tab-flow">
                <span className="flex items-center gap-1.5">
                  Flow Chart
                  <button
                    data-testid="button-regenerate-flow"
                    onClick={(e) => { e.stopPropagation(); regenerateFlowMutation.mutate(); }}
                    disabled={regenerateFlowMutation.isPending}
                    className="ml-0.5 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Regenerate flow chart"
                  >
                    <RefreshCw className={`h-3 w-3 ${regenerateFlowMutation.isPending ? "animate-spin" : ""}`} />
                  </button>
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="instructions" className="mt-6 space-y-6">
            {isRegeneratingInstructions ? (
              <GenerationStatusPage
                implementationId={implementation.id}
                onComplete={(newId) => {
                  setIsRegeneratingInstructions(false);
                  const resolvedId = newId || implementation.id;
                  queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });
                  if (resolvedId !== implementation.id) {
                    setLocation(`/implementation/${resolvedId}`);
                  } else {
                    queryClient.refetchQueries({ queryKey: [`/api/implementations/${implementationId}`] });
                  }
                }}
                onCancel={() => setIsRegeneratingInstructions(false)}
              />
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  Follow these steps in order to build your project. Each step includes an explanation of <strong>why</strong> you're doing it.
                </div>
                {implementation.instructions ? (
                  <div className="space-y-6">
                    <InstructionsDisplay instructions={implementation.instructions} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 py-16 border rounded-lg bg-muted/20 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Instructions not available</p>
                      <p className="text-xs text-muted-foreground">The AI did not produce instructions for this project. You can regenerate them now.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsRegeneratingInstructions(true)}
                      data-testid="button-regenerate-instructions"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-2" />
                      Regenerate Instructions
                    </Button>
                  </div>
                )}
              </>
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

          <TabsContent value="flow" className="mt-4">
            {implementation.flowDiagram ? (
              activeTab === "flow" && <FlowChart diagram={implementation.flowDiagram} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-16 border rounded-lg bg-muted/20 text-center">
                <Workflow className="h-10 w-10 text-muted-foreground/40" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No flow chart generated yet</p>
                  <p className="text-xs text-muted-foreground">Click the refresh icon next to "Flow Chart" to generate one.</p>
                </div>
                <button
                  onClick={() => regenerateFlowMutation.mutate()}
                  disabled={regenerateFlowMutation.isPending}
                  className="flex items-center gap-2 text-sm text-primary hover:underline disabled:opacity-50"
                  data-testid="button-generate-flow-empty"
                >
                  {regenerateFlowMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                  ) : (
                    <><RefreshCw className="h-3.5 w-3.5" /> Generate Flow Chart</>
                  )}
                </button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Mark as Completed */}
        <div className="border-t pt-6">
          <Button
            onClick={() => setShowCompletionDialog(true)}
            disabled={markCompletedMutation.isPending}
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
                Update Completion Data
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Completed Project
              </>
            )}
          </Button>
        </div>

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
                          <span className="text-xs font-medium text-[#7c2d12]">Other Versions:</span>
                          <div className="flex gap-1 flex-wrap">
                            {versions
                              .filter(v => v.id !== implementation.id)
                              .map((v) => (
                                <Badge 
                                  key={v.id} 
                                  variant="outline" 
                                  className="text-[10px] px-1.5 py-0 cursor-pointer border-[#7c2d12]/30 bg-[#7c2d12]/5 text-[#7c2d12] hover:bg-[#7c2d12]/10 no-default-hover-elevate"
                                  onClick={() => setLocation(`/implementation/${v.id}`)}
                                >
                                  {v.tool} (v{v.version})
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
                              size="sm"
                              className="h-8 gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                              onClick={() => setShowDeleteDialog(true)}
                              data-testid="button-delete-project"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Delete Project</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove this project and its versions</p>
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
                        variant="outline"
                        className="cursor-pointer hover-elevate px-3 py-1.5 border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                        onClick={() => handleConvertTo(tool)}
                        data-testid={`badge-convert-${tool.toLowerCase()}`}
                      >
                        {tool}
                      </Badge>
                    ))
                  ) : (
                    <div className="flex items-center text-xs text-muted-foreground animate-pulse">
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Analyzing project for alternatives...
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-primary hover:bg-transparent"
                    onClick={handleFindMoreAlternatives}
                  >
                    Find other alternatives
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
                          if (e.key === "Enter") handleCustomToolConvert();
                        }}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Tell us which tool you prefer, and we will translate the project for you.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleCustomToolConvert}
                      disabled={!customTool.trim() || isValidating}
                    >
                      {isValidating ? (
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
                {surveyPage === 1 ? "What Did You Achieve?" : 
                 surveyPage === 2 ? "How Did It Go?" : 
                 "Ready to Submit"}
              </DialogTitle>
              <DialogDescription>
                {surveyPage === 1 ? "Select the objectives you achieved and the skills you put into practice." :
                 surveyPage === 2 ? "Reflect on your experience building this project." :
                 "Great work! Confirming will mark this project as complete."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
              {surveyPage === 1 && (
                <>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Objectives I Achieved</h4>
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
                    <h4 className="text-sm font-medium">Skills I Applied</h4>
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
                    <h4 className="text-sm font-medium">The AI's suggestions were helpful for my skill level</h4>
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
