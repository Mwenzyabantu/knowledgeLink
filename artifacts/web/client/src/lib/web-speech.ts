type StateCallback = (isRecording: boolean) => void;
type ResultCallback = (text: string) => void;
type ErrorCallback = (error: string) => void;

class SpeechRecognizer {
  private recognition: any = null;
  private stateCallbacks: StateCallback[] = [];
  private resultCallbacks: ResultCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private isCurrentlyRecording = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            }
          }
          if (finalTranscript) {
            this.resultCallbacks.forEach(cb => cb(finalTranscript.trim()));
          }
        };

        this.recognition.onerror = (event: any) => {
          this.errorCallbacks.forEach(cb => cb(event.error));
          this.isCurrentlyRecording = false;
          this.stateCallbacks.forEach(cb => cb(false));
        };

        this.recognition.onend = () => {
          this.isCurrentlyRecording = false;
          this.stateCallbacks.forEach(cb => cb(false));
        };
      }
    }
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  start(): void {
    if (this.recognition && !this.isCurrentlyRecording) {
      this.recognition.start();
      this.isCurrentlyRecording = true;
      this.stateCallbacks.forEach(cb => cb(true));
    }
  }

  stop(): void {
    if (this.recognition && this.isCurrentlyRecording) {
      this.recognition.stop();
    }
  }

  onStateChange(callback: StateCallback): void {
    this.stateCallbacks.push(callback);
  }

  onResult(callback: ResultCallback): void {
    this.resultCallbacks.push(callback);
  }

  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }
}

export const speechRecognizer = new SpeechRecognizer();
