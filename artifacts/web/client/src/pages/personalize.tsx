import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Volume2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { localStorage } from "@/lib/services/localStorage";
import type { UserPersonalization } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Personalize() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [careerGoals, setCareerGoals] = useState<string[]>([]);
  const [desiredRole, setDesiredRole] = useState("");
  const [aspiringCareer, setAspiringCareer] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [skillsFocus, setSkillsFocus] = useState("");
  const [preferredVoice, setPreferredVoice] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const { data: personalization, isLoading } = useQuery<UserPersonalization>({
    queryKey: ["/api/user-personalization"],
    enabled: !!user,
  });

  useEffect(() => {
    if (personalization) {
      setCareerGoals(personalization.careerGoals || []);
      setDesiredRole(personalization.desiredRole || "");
      setAspiringCareer(personalization.aspiringCareer || "");
      setTargetIndustry(personalization.targetIndustry || "");
      setSkillsFocus(personalization.skillsFocus?.join(", ") || "");
      setPreferredVoice(personalization.preferredVoice || "");
    }
  }, [personalization]);

  useEffect(() => {
    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
    };
  }, []);

  const careerMutation = useMutation({
    mutationFn: async () => {
      const skillsArray = skillsFocus
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);
      const prefs = localStorage.prefs.get();
      localStorage.prefs.set({
        ...prefs,
        personalization: {
          ...(prefs.personalization || {}),
          careerGoals,
          desiredRole,
          aspiringCareer,
          targetIndustry,
          skillsFocus: skillsArray,
        },
      });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-personalization"] });
      toast({ title: "Success", description: "Career settings saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save career settings" });
    },
  });

  const readerMutation = useMutation({
    mutationFn: async () => {
      const prefs = localStorage.prefs.get();
      localStorage.prefs.set({
        ...prefs,
        personalization: {
          ...(prefs.personalization || {}),
          preferredVoice,
        },
      });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-personalization"] });
      toast({ title: "Success", description: "Reader settings saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save reader settings" });
    },
  });

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="space-y-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Personalize Your Experience</h1>
        <p className="text-muted-foreground">
          Tailor KnowledgeLInk to your career journey and learning preferences.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="career" className="space-y-6">
          <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-6">
            <TabsTrigger 
              value="career" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
            >
              Career Path
            </TabsTrigger>
            <TabsTrigger 
              value="reader" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
            >
              Reader settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="career" className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Career Goals</Label>
              <div className="space-y-2">
                {careerGoals.map((goal, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="e.g., Become a Data Engineer"
                      value={goal}
                      onChange={(e) => {
                        const newGoals = [...careerGoals];
                        newGoals[index] = e.target.value;
                        setCareerGoals(newGoals);
                      }}
                      className="text-sm flex-1 border-0 border-b rounded-none focus-visible:ring-0 px-0"
                      data-testid={`input-career-goal-${index}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCareerGoals(careerGoals.filter((_, i) => i !== index));
                      }}
                      data-testid={`button-remove-goal-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCareerGoals([...careerGoals, ""])}
                className="w-full"
                data-testid="button-add-goal"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Career Goal
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="aspiring-career" className="text-sm font-medium">Aspiring Career</Label>
              <Input
                id="aspiring-career"
                placeholder="e.g., Senior AI Researcher"
                value={aspiringCareer}
                onChange={(e) => setAspiringCareer(e.target.value)}
                className="text-sm border-0 border-b rounded-none focus-visible:ring-0 px-0"
                data-testid="input-aspiring-career"
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="target-industry" className="text-sm font-medium">Target Industry</Label>
              <Input
                id="target-industry"
                placeholder="e.g., Renewable Energy, Healthcare AI"
                value={targetIndustry}
                onChange={(e) => setTargetIndustry(e.target.value)}
                className="text-sm border-0 border-b rounded-none focus-visible:ring-0 px-0"
                data-testid="input-target-industry"
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="desired-role" className="text-sm font-medium">Desired Role (Optional)</Label>
              <Input
                id="desired-role"
                placeholder="e.g., Full Stack Developer"
                value={desiredRole}
                onChange={(e) => setDesiredRole(e.target.value)}
                className="text-sm border-0 border-b rounded-none focus-visible:ring-0 px-0"
                data-testid="input-desired-role"
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="skills-focus" className="text-sm font-medium">Key Skills to Focus On (Optional)</Label>
              <Input
                id="skills-focus"
                placeholder="e.g., Python, System Design (comma-separated)"
                value={skillsFocus}
                onChange={(e) => setSkillsFocus(e.target.value)}
                className="text-sm border-0 border-b rounded-none focus-visible:ring-0 px-0"
                data-testid="input-skills-focus"
              />
            </div>

            <Button
              onClick={() => careerMutation.mutate()}
              disabled={careerMutation.isPending}
              className="w-full mt-4"
              data-testid="button-save-personalization"
            >
              {careerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </TabsContent>

          <TabsContent value="reader" className="space-y-6 pt-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Voice & Accent</Label>
                <p className="text-xs text-muted-foreground">
                  Select your preferred voice for reading concepts and chat responses.
                </p>
                <Select value={preferredVoice || "default"} onValueChange={setPreferredVoice}>
                  <SelectTrigger className="w-full text-sm border-0 border-b rounded-none focus:ring-0 px-0 h-10" data-testid="select-voice">
                    <SelectValue placeholder="System Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">System Default</SelectItem>
                    {voices.map((voice) => (
                      <SelectItem key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/30 rounded-md p-4 border flex items-start gap-3">
                <Volume2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold">Test the voice</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Click the button below to hear a sample of the selected voice.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const synth = window.speechSynthesis;
                      synth.cancel();
                      const utterance = new SpeechSynthesisUtterance("Hello! This is a sample of the reading voice you have selected.");
                      if (preferredVoice && preferredVoice !== "default") {
                        const voice = voices.find(v => v.name === preferredVoice);
                        if (voice) utterance.voice = voice;
                      }
                      synth.speak(utterance);
                    }}
                  >
                    Play Sample
                  </Button>
                </div>
              </div>
            </div>

            <Button
              onClick={() => readerMutation.mutate()}
              disabled={readerMutation.isPending}
              className="w-full mt-4"
              data-testid="button-save-personalization-reader"
            >
              {readerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Reader Settings
            </Button>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
