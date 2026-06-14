import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speechRecognizer } from "@/lib/web-speech";
import { useToast } from "@/hooks/use-toast";
import { localStorage } from "@/lib/services/localStorage";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("");
  const { toast } = useToast();
  const statusTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!speechRecognizer.isSupported()) {
      return;
    }

    speechRecognizer.onResult((text) => {
      setTranscript((prev) => (prev + " " + text).trim());
    });

    speechRecognizer.onStateChange((recording) => {
      setIsRecording(recording);
    });

    speechRecognizer.onError((error) => {
      toast({
        title: "Voice input error",
        description: error,
        variant: "destructive",
      });
      setStatus("");
    });

    return () => {
      speechRecognizer.stop();
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [toast]);

  const processTranscript = async (audioTranscript: string) => {
    try {
      const response = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audioData: audioTranscript }),
      });

      if (!response.ok) {
        throw new Error("Failed to start transcription");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            
            if (data.status) {
              setStatus(data.status);
            } else if (data.transcript) {
              setStatus("");
              onTranscript(data.transcript);
              setTranscript("");
            } else if (data.error) {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (error) {
      setStatus("");
      toast({
        title: "Transcription error",
        description: "Failed to process voice input",
        variant: "destructive",
      });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      speechRecognizer.stop();
      if (transcript) {
        processTranscript(transcript);
      }
    } else {
      setTranscript("");
      setStatus("");
      speechRecognizer.start();
    }
  };

  if (!speechRecognizer.isSupported()) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleRecording}
        className={isRecording ? "text-destructive" : ""}
        data-testid="button-voice"
      >
        {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
      {status && (
        <span className="text-sm text-muted-foreground" data-testid="status-voice">
          {status}
        </span>
      )}
      {!status && transcript && (
        <span className="text-sm text-muted-foreground truncate max-w-xs">
          {transcript}
        </span>
      )}
    </div>
  );
}
