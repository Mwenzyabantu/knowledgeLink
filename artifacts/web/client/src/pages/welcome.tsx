import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Lightbulb, Rocket, Target, ArrowRight } from "lucide-react";

export default function Welcome() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="max-w-3xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Welcome to <span className="text-primary">KnowledgeLInk</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Master complex concepts through AI-driven insights and hands-on projects.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 py-12">
          <Card className="hover-elevate">
            <CardContent className="pt-6 space-y-2">
              <Lightbulb className="h-10 w-10 text-primary mx-auto" />
              <h3 className="font-semibold text-lg">Understand</h3>
              <p className="text-sm text-muted-foreground">Get AI-powered 5W+H breakdowns of any concept.</p>
            </CardContent>
          </Card>
          <Card className="hover-elevate">
            <CardContent className="pt-6 space-y-2">
              <Target className="h-10 w-10 text-primary mx-auto" />
              <h3 className="font-semibold text-lg">Personalize</h3>
              <p className="text-sm text-muted-foreground">Tailor your learning journey to your career goals.</p>
            </CardContent>
          </Card>
          <Card className="hover-elevate">
            <CardContent className="pt-6 space-y-2">
              <Rocket className="h-10 w-10 text-primary mx-auto" />
              <h3 className="font-semibold text-lg">Build</h3>
              <p className="text-sm text-muted-foreground">Apply knowledge with real-world project simulations.</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="min-h-12 px-8"
            onClick={() => setLocation("/auth")}
            data-testid="button-get-started"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
