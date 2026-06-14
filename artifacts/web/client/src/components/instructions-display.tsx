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
    
    const applyFormat = (parts: any[], regex: RegExp, wrapper: (match: string, index: number) => React.ReactNode) => {
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
            result.push(wrapper(matches[i], i));
          }
        });
      });
      return result.filter(p => p !== "");
    };

    let formatted: any[] = [text];
    formatted = applyFormat(formatted, /\*\*(.*?)\*\*/g, (m, i) =>
      <strong key={`strong-${i}`} className="font-bold">{m.replace(/\*\*/g, '')}</strong>);
    formatted = applyFormat(formatted, /\*(.*?)\*/g, (m, i) =>
      <em key={`em-${i}`} className="italic">{m.replace(/\*/g, '')}</em>);
    formatted = applyFormat(formatted, /`(.*?)`/g, (m, i) =>
      <code key={`code-${i}`} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{m.replace(/`/g, '')}</code>);

    return formatted as (string | React.ReactNode)[];
  };

  // Normalize text so that numbered steps always start on their own line,
  // even when the AI writes them inline ("1. Do this 2. Do that 3. ...").
  const normalizeText = (text: string): string => {
    // First protect code blocks
    const codeBlocks: string[] = [];
    const withPlaceholders = text.replace(/```[\s\S]*?```/g, (match) => {
      codeBlocks.push(match);
      return `\n__CODE_${codeBlocks.length - 1}__\n`;
    });

    // Ensure each numbered item starts on its own line.
    // Handles cases like "1. Do this 2. Do that" or "1. Do this\n2. Do that"
    const normalized = withPlaceholders
      // Insert newline before "2. " "3. " etc. when they appear mid-sentence
      .replace(/(?<=[^\n])(\s)(\d{1,2}\.\s+(?=[A-Z]))/g, '\n$2')
      // Ensure single-newline-separated numbered items become their own paragraph
      .replace(/\n(\d{1,2}\.\s)/g, '\n\n$1');

    // Restore code blocks
    return codeBlocks.reduce((acc, block, i) =>
      acc.replace(`__CODE_${i}__`, block), normalized);
  };

  const renderContent = (text: string) => {
    if (!text || !text.trim()) return null;

    const normalised = normalizeText(text);
    const paragraphs = normalised.split("\n\n");

    return (
      <div className="space-y-6 text-sm leading-relaxed">
        {paragraphs.map((paragraph, idx) => {
          const trimmed = paragraph.trim();
          if (!trimmed) return null;

          // Code blocks
          const codeBlockRegex = /```([\w]*)\n?([\s\S]*?)```/g;
          if (codeBlockRegex.test(trimmed)) {
            const parts = trimmed.split(/```([\w]*)\n?([\s\S]*?)```/g);
            return (
              <div key={idx} className="space-y-4">
                {parts.map((part, partIdx) => {
                  if (!part.trim()) return null;
                  if (partIdx % 3 === 0) {
                    if (part.trim()) {
                      const formatted = formatText(part.trim());
                      return (
                        <p key={`text-${idx}-${partIdx}`} className="text-foreground leading-relaxed">
                          {Array.isArray(formatted) ? formatted.map((node, ni) => <span key={ni}>{node}</span>) : formatted}
                        </p>
                      );
                    }
                  } else if (partIdx % 3 === 2) {
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
                            customStyle={{ margin: 0, padding: "1rem", fontSize: "0.875rem", lineHeight: "1.5", borderRadius: "0" }}
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

          // Callouts
          if (trimmed.includes("BEFORE YOU BEGIN") || trimmed.includes("QUICK START") || trimmed.includes("Quick Start")) {
            const formatted = formatText(trimmed);
            return (
              <div key={idx} className="bg-gradient-to-r from-primary/10 to-primary/5 border-l-4 border-primary px-4 py-4 rounded-r-md">
                {Array.isArray(formatted) ? formatted.map((node, ni) => <span key={ni}>{node}</span>) : formatted}
              </div>
            );
          }

          // Step/Section Headings
          if (/^(Step \d+|###|##|#)/i.test(trimmed)) {
            const formatted = formatText(trimmed.replace(/^#+\s*/, ""));
            return <div key={idx} className="text-foreground text-lg font-semibold pt-4">{formatted}</div>;
          }

          // Numbered list items
          if (/^\d+\./.test(trimmed)) {
            const formatted = formatText(trimmed);
            return <div key={idx} className="pl-2 border-l-2 border-primary/30">{formatted}</div>;
          }

          // Bullet items
          if (/^[-•*]\s/.test(trimmed)) {
            const formatted = formatText(trimmed.replace(/^[-•*]\s/, ""));
            return (
              <div key={idx} className="pl-2 flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{Array.isArray(formatted) ? formatted.map((node, ni) => <span key={ni}>{node}</span>) : formatted}</span>
              </div>
            );
          }

          const formatted = formatText(trimmed);
          return (
            <div key={idx} className="text-foreground leading-relaxed" data-testid={`paragraph-${idx}`}>
              {Array.isArray(formatted) ? formatted.map((node, ni) => <span key={ni}>{node}</span>) : formatted}
            </div>
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
