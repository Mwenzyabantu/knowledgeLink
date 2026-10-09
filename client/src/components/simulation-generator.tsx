
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Code, 
  Play, 
  Download, 
  Settings, 
  Zap,
  GitBranch,
  Activity
} from "lucide-react";

interface SimulationTool {
  id: string;
  name: string;
  language: string;
  icon: string;
  useCases: string[];
}

interface SimulationGeneratorProps {
  concept: string;
  onGenerate?: (code: string, tool: string) => void;
}

const SIMULATION_TOOLS: SimulationTool[] = [
  {
    id: "matlab",
    name: "MATLAB/Simulink",
    language: "matlab",
    icon: "🔬",
    useCases: ["Control Systems", "Signal Processing", "Physics Simulations"]
  },
  {
    id: "python",
    name: "Python (NumPy/SciPy)",
    language: "python",
    icon: "🐍",
    useCases: ["Data Analysis", "Machine Learning", "Scientific Computing"]
  },
  {
    id: "javascript",
    name: "JavaScript (D3.js)",
    language: "javascript",
    icon: "📊",
    useCases: ["Web Visualizations", "Interactive Demos", "Data Viz"]
  },
  {
    id: "cpp",
    name: "C++ (Simulation)",
    language: "cpp",
    icon: "⚡",
    useCases: ["High Performance", "Real-time Systems", "Physics Engines"]
  }
];

export function SimulationGenerator({ concept, onGenerate }: SimulationGeneratorProps) {
  const [selectedTool, setSelectedTool] = useState<SimulationTool>(SIMULATION_TOOLS[0]);
  const [generatedCode, setGeneratedCode] = useState("");
  const [pseudocode, setPseudocode] = useState("");
  const [flowDiagram, setFlowDiagram] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [simulationParams, setSimulationParams] = useState({
    timeStep: 0.01,
    duration: 10,
    damping: 0.5
  });

  const generateSimulation = async () => {
    setIsGenerating(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate based on concept and tool
    if (concept.toLowerCase().includes("spring") || concept.toLowerCase().includes("damping")) {
      if (selectedTool.id === "matlab") {
        setGeneratedCode(`% Spring-Mass-Damper System Simulation
% Parameters
m = 1;          % mass (kg)
k = 10;         % spring constant (N/m)
c = ${simulationParams.damping};  % damping coefficient

% System setup
omega_n = sqrt(k/m);
zeta = c/(2*sqrt(k*m));

% Time vector
t = 0:${simulationParams.timeStep}:${simulationParams.duration};

% Initial conditions
x0 = 1;  % initial displacement
v0 = 0;  % initial velocity

% Solve differential equation
[t, x] = ode45(@(t,y) [y(2); -c/m*y(2) - k/m*y(1)], t, [x0; v0]);

% Plot results
figure;
plot(t, x(:,1), 'LineWidth', 2);
xlabel('Time (s)');
ylabel('Displacement (m)');
title('Spring-Mass-Damper Response');
grid on;

% Display damping ratio
fprintf('Natural frequency: %.2f rad/s\\n', omega_n);
fprintf('Damping ratio: %.3f\\n', zeta);
if zeta < 1
    fprintf('System is underdamped\\n');
elseif zeta == 1
    fprintf('System is critically damped\\n');
else
    fprintf('System is overdamped\\n');
end`);

        setPseudocode(`ALGORITHM: Spring-Mass-Damper Simulation

INPUT:
  - mass (m)
  - spring constant (k)
  - damping coefficient (c)
  - time step (dt)
  - simulation duration (T)

PROCESS:
1. Calculate natural frequency: ωₙ = √(k/m)
2. Calculate damping ratio: ζ = c/(2√(km))
3. Initialize position x₀ and velocity v₀
4. FOR each time step t:
   a. Calculate acceleration: a = -(c/m)v - (k/m)x
   b. Update velocity: v = v + a·dt
   c. Update position: x = x + v·dt
   d. Store results
5. ENDFOR

OUTPUT:
  - Time series of position vs time
  - System classification (under/critically/over damped)`);

        setFlowDiagram(`┌─────────────────┐
│  Start          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Define System   │
│ Parameters      │
│ (m, k, c)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Calculate       │
│ ωₙ and ζ        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Set Initial     │
│ Conditions      │
│ (x₀, v₀)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Time Loop       │◄─────┐
│ t < T?          │      │
└────────┬────────┘      │
         │ Yes           │
         ▼               │
┌─────────────────┐      │
│ Calculate       │      │
│ Acceleration    │      │
└────────┬────────┘      │
         │               │
         ▼               │
┌─────────────────┐      │
│ Update Velocity │      │
│ & Position      │      │
└────────┬────────┘      │
         │               │
         ▼               │
┌─────────────────┐      │
│ Store Results   │──────┘
└─────────────────┘
         │ No
         ▼
┌─────────────────┐
│ Plot & Display  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  End            │
└─────────────────┘`);
      } else if (selectedTool.id === "python") {
        setGeneratedCode(`import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint

# System parameters
m = 1.0          # mass (kg)
k = 10.0         # spring constant (N/m)
c = ${simulationParams.damping}   # damping coefficient

# Derived parameters
omega_n = np.sqrt(k/m)
zeta = c/(2*np.sqrt(k*m))

# Time vector
t = np.arange(0, ${simulationParams.duration}, ${simulationParams.timeStep})

# Differential equation: x'' + (c/m)x' + (k/m)x = 0
def spring_damper(state, t):
    x, v = state
    dxdt = v
    dvdt = -(c/m)*v - (k/m)*x
    return [dxdt, dvdt]

# Initial conditions
x0 = 1.0  # initial displacement
v0 = 0.0  # initial velocity

# Solve ODE
solution = odeint(spring_damper, [x0, v0], t)
x = solution[:, 0]

# Plot results
plt.figure(figsize=(10, 6))
plt.plot(t, x, linewidth=2)
plt.xlabel('Time (s)')
plt.ylabel('Displacement (m)')
plt.title(f'Spring-Mass-Damper Response (ζ={zeta:.3f})')
plt.grid(True)
plt.show()

# Print system characteristics
print(f"Natural frequency: {omega_n:.2f} rad/s")
print(f"Damping ratio: {zeta:.3f}")
if zeta < 1:
    print("System is underdamped")
elif zeta == 1:
    print("System is critically damped")
else:
    print("System is overdamped")`);

        setPseudocode(`Same pseudocode structure as MATLAB version`);
        setFlowDiagram(`Same flow diagram structure`);
      }
    } else {
      // Generic template for other concepts
      setGeneratedCode(`// Simulation for: ${concept}
// Tool: ${selectedTool.name}
// 
// TODO: Implement simulation logic
// This would be generated by AI based on the specific concept`);
      setPseudocode(`ALGORITHM: ${concept} Simulation
[AI would generate concept-specific pseudocode here]`);
      setFlowDiagram(`[AI would generate concept-specific flow diagram here]`);
    }

    setIsGenerating(false);
    onGenerate?.(generatedCode, selectedTool.id);
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation_${selectedTool.id}.${selectedTool.language}`;
    a.click();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Interactive Simulation Generator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Generate code, pseudocode, and flow diagrams for: <strong>{concept}</strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tool Selection */}
        <div>
          <h3 className="text-sm font-medium mb-3">Select Simulation Tool</h3>
          <div className="grid grid-cols-2 gap-3">
            {SIMULATION_TOOLS.map((tool) => (
              <Button
                key={tool.id}
                variant={selectedTool.id === tool.id ? "default" : "outline"}
                className="justify-start h-auto py-3"
                onClick={() => setSelectedTool(tool)}
              >
                <div className="flex items-start gap-2 text-left">
                  <span className="text-2xl">{tool.icon}</span>
                  <div>
                    <div className="font-medium">{tool.name}</div>
                    <div className="text-xs opacity-70">{tool.useCases[0]}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Simulation Parameters */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4" />
            <h3 className="text-sm font-medium">Simulation Parameters</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs">Time Step: {simulationParams.timeStep}s</label>
              <Slider
                value={[simulationParams.timeStep]}
                onValueChange={([value]) => setSimulationParams(p => ({ ...p, timeStep: value }))}
                min={0.001}
                max={0.1}
                step={0.001}
              />
            </div>
            
            <div>
              <label className="text-xs">Duration: {simulationParams.duration}s</label>
              <Slider
                value={[simulationParams.duration]}
                onValueChange={([value]) => setSimulationParams(p => ({ ...p, duration: value }))}
                min={1}
                max={50}
                step={1}
              />
            </div>
            
            <div>
              <label className="text-xs">Damping: {simulationParams.damping}</label>
              <Slider
                value={[simulationParams.damping]}
                onValueChange={([value]) => setSimulationParams(p => ({ ...p, damping: value }))}
                min={0}
                max={2}
                step={0.1}
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={generateSimulation} 
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Zap className="mr-2 h-4 w-4 animate-pulse" />
              Generating with AI...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Generate Simulation
            </>
          )}
        </Button>

        {/* Results Tabs */}
        {generatedCode && (
          <Tabs defaultValue="code" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="code">
                <Code className="mr-2 h-4 w-4" />
                Code
              </TabsTrigger>
              <TabsTrigger value="pseudocode">
                <GitBranch className="mr-2 h-4 w-4" />
                Pseudocode
              </TabsTrigger>
              <TabsTrigger value="flow">
                <Activity className="mr-2 h-4 w-4" />
                Flow Diagram
              </TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge>{selectedTool.language}</Badge>
                <Button variant="ghost" size="sm" onClick={downloadCode}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
              <pre className="bg-black text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                {generatedCode}
              </pre>
            </TabsContent>

            <TabsContent value="pseudocode">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                {pseudocode}
              </pre>
            </TabsContent>

            <TabsContent value="flow">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {flowDiagram}
              </pre>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
