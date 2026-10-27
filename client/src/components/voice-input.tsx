import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speechRecognizer } from "@/lib/web-speech";
import { useToast } from "@/hooks/use-toast";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const { toast } = useToast();
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    if (!speechRecognizer.isSupported()) {
      return;
    }

    const unsubscribeResult = speechRecognizer.onResult((text) => {
      const finalText = text.trim();
      if (!finalText) return;

      setTranscript((prev) => (prev + " " + finalText).trim());
      onTranscriptRef.current(finalText);
    });

    const unsubscribeState = speechRecognizer.onStateChange(setIsRecording);

    const unsubscribeError = speechRecognizer.onError((error) => {
      toast({
        title: "Voice input error",
        description: error,
        variant: "destructive",
      });
      setIsRecording(false);
    });

    return () => {
      unsubscribeResult();
      unsubscribeState();
      unsubscribeError();
      speechRecognizer.stop();
    };
  }, [toast]);

  const toggleRecording = () => {
    if (isRecording) {
      speechRecognizer.stop();
    } else {
      setTranscript("");
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
        aria-label={isRecording ? "Stop voice input" : "Start voice input"}
        aria-pressed={isRecording}
        data-testid="button-voice"
      >
        {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
      {transcript && (
        <span className="text-sm text-muted-foreground truncate max-w-xs">
          {transcript}
        </span>
      )}
    </div>
  );
}
