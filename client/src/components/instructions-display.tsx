import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
// @ts-ignore
import SyntaxHighlighter from "react-syntax-highlighter";
// @ts-ignore
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { type Implementation } from "@shared/schema";
import { ProjectSurveyModal } from "./project-survey-modal";

interface InstructionsDisplayProps {
  instructions: string;
  implementation?: Implementation;
  onCopyCode?: (code: string) => void;
}

export function InstructionsDisplay({ instructions, implementation, onCopyCode }: InstructionsDisplayProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    onCopyCode?.(code);
  };

  const formatText = (text: string) => {
    if (!text) return text;
    
    // Bold: **text**
    let formatted: any[] = [text];
    
    const applyFormat = (parts: any[], regex: RegExp, wrapper: (match: string) => React.ReactNode) => {
      const result: any[] = [];
      parts.forEach(part => {
        if (typeof part !== 'string') {
          result.push(part);
          return;
        }
        
        const subParts = part.split(regex);
        const matches = part.match(regex);
        
        subParts.forEach((subPart, i) => {
          result.push(subPart);
          if (matches && matches[i]) {
            result.push(wrapper(matches[i]));
          }
        });
      });
      return result.filter(p => p !== "");
    };

    // Bold: **text**
    formatted = applyFormat(formatted, /\*\*(.*?)\*\*/g, (m) => <strong key={`strong-${m}`} className="font-bold">{m.replace(/\*\*/g, '')}</strong>);
    
    // Italic: *text* or _text_
    formatted = applyFormat(formatted, /\*(.*?)\*/g, (m) => <em key={`em-${m}`} className="italic">{m.replace(/\*/g, '')}</em>);
    
    // Inline code: `text`
    formatted = applyFormat(formatted, /`(.*?)`/g, (m) => <code key={`code-${m}`} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{m.replace(/`/g, '')}</code>);

    // Strike: ~~text~~
    formatted = applyFormat(formatted, /~~(.*?)~~/g, (m) => <span key={`strike-${m}`} className="line-through">{m.replace(/~~/g, '')}</span>);

    return (formatted as (string | React.ReactNode)[]);
  };

  const renderFormattedText = (text: string) => {
    const formatted = formatText(text);
    return Array.isArray(formatted)
      ? formatted.map((node, nodeIdx) => <span key={nodeIdx}>{node}</span>)
      : formatted;
  };

  const parseNumberedList = (text: string): string[] | null => {
    const markers = Array.from(text.matchAll(/(^|\s)(\d{1,2})[.)]\s+/g));
    if (markers.length === 0 || Number(markers[0][2]) !== 1) return null;

    const firstMarkerStart = markers[0].index ?? 0;
    if (text.slice(0, firstMarkerStart).trim()) return null;

    for (let index = 0; index < markers.length; index += 1) {
      if (Number(markers[index][2]) !== index + 1) return null;
    }

    const items = markers.map((marker, index) => {
      const itemStart = (marker.index ?? 0) + marker[0].length;
      const nextMarker = markers[index + 1];
      const itemEnd = nextMarker
        ? (nextMarker.index ?? text.length) + nextMarker[1].length
        : text.length;
      return text.slice(itemStart, itemEnd).trim();
    });

    return items.every(Boolean) ? items : null;
  };

  const parseBulletList = (text: string): string[] | null => {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0 || lines.some((line) => !/^[-*•]\s+/.test(line))) {
      return null;
    }

    return lines
      .map((line) => line.replace(/^[-*•]\s+/, "").trim())
      .filter(Boolean);
  };

  const renderContent = (text: string) => {
    if (!text || !text.trim()) return null;

    const paragraphBlocks = text.replace(/\r\n?/g, "\n").split(/\n[ \t]*\n+/);
    const paragraphs: string[] = [];

    paragraphBlocks.forEach((block) => {
      const current = block.trim();
      if (!current) return;

      const previous = paragraphs[paragraphs.length - 1];
      const currentNumber = current.match(/^(\d{1,2})[.)]\s+/);
      if (previous && currentNumber) {
        const previousMarkers = Array.from(
          previous.matchAll(/(^|\s)(\d{1,2})[.)]\s+/g),
        );
        const lastPreviousMarker = previousMarkers[previousMarkers.length - 1];
        if (
          lastPreviousMarker &&
          Number(currentNumber[1]) === Number(lastPreviousMarker[2]) + 1
        ) {
          paragraphs[paragraphs.length - 1] = `${previous}\n${current}`;
          return;
        }
      }

      if (previous && parseBulletList(previous) && /^[-*•]\s+/.test(current)) {
        paragraphs[paragraphs.length - 1] = `${previous}\n${current}`;
        return;
      }

      paragraphs.push(current);
    });
    
    return (
      <div className="space-y-6 text-sm leading-relaxed">
        {paragraphs.map((paragraph, idx) => {
          const trimmed = paragraph.trim();
          
          // Skip empty
          if (!trimmed) return null;

          // Detect code blocks (```...```)
          const codeBlockRegex = /```([\w]*)\n?([\s\S]*?)```/g;
          const codeMatches = Array.from(trimmed.matchAll(codeBlockRegex));
          
          if (codeMatches.length > 0) {
            // Has code blocks - render them specially with syntax highlighting
            const parts = trimmed.split(codeBlockRegex);
            return (
              <div key={idx} className="space-y-4">
                {parts.map((part, partIdx) => {
                  if (!part.trim()) return null;
                  // Even indices are text, odd are language, even+1 are code
                  if (partIdx % 3 === 0) {
                    // Text part
                    if (part.trim()) {
                      const formatted = formatText(part.trim());
                      return (
                        <p key={`text-${idx}-${partIdx}`} className="text-foreground leading-relaxed">
                          {Array.isArray(formatted) ? formatted.map((node, nodeIdx) => (
                            <span key={nodeIdx}>{node}</span>
                          )) : formatted}
                        </p>
                      );
                    }
                  } else if (partIdx % 3 === 2) {
                    // Code part - use SyntaxHighlighter for professional syntax highlighting
                    const code = part.trim();
                    const language = parts[partIdx - 1]?.trim() || "javascript";
                    
                    return (
                      <div
                        key={`code-${idx}-${partIdx}`}
                        className="group relative rounded-lg overflow-hidden shadow-md border border-border"
                        data-testid={`code-block-${idx}`}
                      >
                        <div className="bg-slate-900 p-1 text-xs text-slate-400 font-mono flex justify-between items-center px-3 py-2">
                          <span>{language || "code"}</span>
                        </div>
                        <div className="overflow-x-auto bg-slate-950">
                          <SyntaxHighlighter
                            language={language || "javascript"}
                            style={atomOneDark}
                            customStyle={{
                              margin: 0,
                              padding: "1rem",
                              fontSize: "0.875rem",
                              lineHeight: "1.5",
                              borderRadius: "0",
                            }}
                            showLineNumbers={code.split("\n").length > 5}
                            wrapLongLines
                          >
                            {code}
                          </SyntaxHighlighter>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCopyCode(code)}
                          className="absolute top-10 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-slate-800 hover:bg-slate-700"
                          data-testid={`copy-code-${idx}`}
                          title="Copy code"
                        >
                          {copiedCode === code ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-200" />
                          )}
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            );
          }

          // Check for special sections (BEFORE YOU BEGIN, QUICK START)
          if (trimmed.includes("BEFORE YOU BEGIN") || trimmed.includes("Quick Start") || trimmed.includes("QUICK START")) {
            const formatted = formatText(trimmed);
            return (
              <div
                key={`section-${idx}`}
                className="bg-gradient-to-r from-primary/10 to-primary/5 border-l-4 border-primary px-4 py-4 rounded-r-md space-y-2 shadow-sm"
                data-testid={`section-${idx}`}
              >
                <div className="text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                  {Array.isArray(formatted) ? formatted.map((node, nodeIdx) => (
                    <span key={nodeIdx}>{node}</span>
                  )) : formatted}
                </div>
              </div>
            );
          }

          // Check for dividers
          if (trimmed.startsWith("---") || trimmed === "---") {
            return (
              <div key={idx} className="py-3" data-testid={`divider-${idx}`}>
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
            );
          }

          // Check for step/section headings
          if (/^(Step \d+|###|##|#)/i.test(trimmed)) {
            const level = trimmed.match(/^#+/)?.[0]?.length || 1;
            const isStep = /^Step \d+/i.test(trimmed);
            const headingContent = trimmed.replace(/^#+\s*/, "").replace(/^Step /i, "Step ");
            
            const headingSizes = {
              1: "text-2xl font-bold",
              2: "text-xl font-semibold",
              3: "text-lg font-semibold",
            };
            
            const size = headingSizes[Math.min(level, 3) as keyof typeof headingSizes] || "text-base font-semibold";
            const formatted = formatText(headingContent);
            
            return (
              <div 
                key={`heading-${idx}`} 
                className={`pt-4 ${isStep ? "mt-6 border-t border-border/50 pt-6" : ""}`} 
                data-testid={`heading-${idx}`}
              >
                <div className={`text-foreground ${size}`}>
                  {Array.isArray(formatted) ? formatted.map((node, nodeIdx) => (
                    <span key={nodeIdx}>{node}</span>
                  )) : formatted}
                </div>
              </div>
            );
          }

          // Check for screenshot placeholders
          if (trimmed.toLowerCase().includes("screenshot")) {
            return (
              <div
                key={`screenshot-${idx}`}
                className="py-8 px-6 bg-muted/50 border-2 border-dashed border-muted-foreground/40 rounded-lg text-center hover:bg-muted/70 transition-colors"
                data-testid={`screenshot-${idx}`}
              >
                <p className="text-sm text-muted-foreground italic font-medium">{trimmed}</p>
              </div>
            );
          }

          const numberedItems = parseNumberedList(trimmed);
          if (numberedItems) {
            return (
              <ol
                key={`numbered-list-${idx}`}
                className="list-decimal space-y-3 pl-6 text-foreground marker:font-semibold marker:text-primary"
                data-testid={`numbered-list-${idx}`}
              >
                {numberedItems.map((item, itemIdx) => (
                  <li
                    key={`step-${idx}-${itemIdx}`}
                    className="pl-1 leading-relaxed"
                    data-testid={`instruction-step-${idx}-${itemIdx + 1}`}
                  >
                    {renderFormattedText(item)}
                  </li>
                ))}
              </ol>
            );
          }

          const bulletItems = parseBulletList(trimmed);
          if (bulletItems) {
            return (
              <ul
                key={`bullet-list-${idx}`}
                className="list-disc space-y-2 pl-6 text-foreground marker:text-primary"
                data-testid={`bullet-list-${idx}`}
              >
                {bulletItems.map((item, itemIdx) => (
                  <li key={`bullet-${idx}-${itemIdx}`} className="pl-1 leading-relaxed">
                    {renderFormattedText(item)}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p
              key={`para-${idx}`}
              className="text-foreground leading-relaxed whitespace-pre-wrap"
              data-testid={`paragraph-${idx}`}
            >
              {renderFormattedText(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {implementation && (
        <div className="grid gap-6 md:grid-cols-2">
          {implementation.expectedOutcomes && implementation.expectedOutcomes.length > 0 && (
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Expected Outcomes
              </h4>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {implementation.expectedOutcomes.map((outcome, i) => (
                  <li key={i}>{outcome}</li>
                ))}
              </ul>
            </div>
          )}
          
          {implementation.learningGoals && implementation.learningGoals.length > 0 && (
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <h4 className="font-semibold flex items-center gap-2 text-primary">
                Learning Goals
              </h4>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {implementation.learningGoals.map((goal, i) => (
                  <li key={i}>{goal}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {instructions && instructions.trim() ? (
        <div className="space-y-8 text-foreground" data-testid="instructions-content">
          {renderContent(instructions)}
        </div>
      ) : (
        <div className="p-8 text-center border rounded-lg bg-yellow-950/20 border-yellow-700/50">
          <p className="text-sm text-muted-foreground mb-4 font-medium">
            Instructions are being generated by our AI system.
          </p>
          <p className="text-xs text-muted-foreground">
            This content will appear here once generation completes. Check the Code or Algorithm tabs in the meantime.
          </p>
        </div>
      )}

      {implementation && implementation.status !== "completed" && (
        <div className="flex flex-col items-center justify-center pt-12 pb-8 border-t gap-4">
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-lg">Ready to complete the project?</h3>
            <p className="text-sm text-muted-foreground">
              Reflect on your progress to finalize this implementation.
            </p>
          </div>
          <Button 
            size="lg"
            onClick={() => setIsSurveyOpen(true)}
            data-testid="button-mark-complete"
            className="px-8"
          >
            Mark as Completed
          </Button>
        </div>
      )}

      {implementation && (
        <ProjectSurveyModal
          implementation={implementation}
          isOpen={isSurveyOpen}
          onClose={() => setIsSurveyOpen(false)}
        />
      )}
    </div>
  );
}
