import { useState } from "react";
import { SimpleInput } from "@/components/simple-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimulationGenerator } from "@/components/simulation-generator";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  showSimulation?: boolean;
  simulationConcept?: string;
}

export default function Chat() {
  // TODO: remove mock data
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm here to help you understand how the things you learn solve real-world problems. Share a concept, and I'll explain what problem it addresses, how it works, why it matters, and where it's applied.",
      timestamp: "Just now",
    },
  ]);
  
  const [hasClickedGenerate, setHasClickedGenerate] = useState(false);

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMessage]);

    // TODO: replace with actual AI response
    setTimeout(() => {
      // Example of how an AI message might include simulation data
      let aiMessage: Message;
      if (content.toLowerCase().includes("spring simulation")) { // Example trigger for simulation
        aiMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Here's an explanation of spring damping simulation:\n\nWhat problem does this solve?\nThis concept addresses oscillations and energy dissipation in mechanical systems.\n\nHow does it work?\nIt models the forces and motion of a spring with damping.\n\nWhere is it used?\n• Vehicle suspension systems\n• Structural engineering (earthquake resistance)\n• Robotics",
          timestamp: "Just now",
          showSimulation: true,
          simulationConcept: "matlab simulink for simulating laplace damping in a spring",
        };
      } else {
        aiMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Great question! Let me break this down:\n\nWhat problem does this solve?\nThis concept addresses [specific real-world problem].\n\nHow does it work?\n[Clear explanation of the mechanism]\n\nWhere is it used?\n• [Application 1]\n• [Application 2]\n• [Application 3]",
          timestamp: "Just now",
        };
      }
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="py-6 border-b">
        <h1 className="text-2xl font-semibold mb-1">AI Companion</h1>
        <p className="text-sm text-muted-foreground">
          Your guide to understanding real-world applications
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div key={message.id} className="mb-4">
                <div
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[80%]">
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-message-content">
                        {message.content}
                      </p>
                    </div>
                    {message.showSimulation && message.simulationConcept && (
                      <div className="mt-4 max-w-full">
                        <SimulationGenerator concept={message.simulationConcept} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {hasClickedGenerate && (
            <div className="py-4 border-t mt-4">
              <Button
                onClick={() => setHasClickedGenerate(false)}
                variant="default"
                data-testid="button-generate-implementation"
              >
                Generate Implementation
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      <SimpleInput
        onSend={handleSendMessage}
        placeholder="Ask about problems, applications, or connections..."
      />
      
      {!hasClickedGenerate && (
        <div className="flex gap-2 py-3 px-0 border-t">
          <Button
            variant="outline"
            data-testid="button-ask-question"
          >
            Ask Question
          </Button>
          <Button
            onClick={() => setHasClickedGenerate(true)}
            variant="default"
            data-testid="button-generate-implementation"
          >
            Generate Implementation
          </Button>
        </div>
      )}
    </div>
  );
}