const fs = require('fs');

// Fix server/routes.ts
const routesPath = 'server/routes.ts';
let routesContent = fs.readFileSync(routesPath, 'utf8');
// The error was an extra ) around line 449. Looking at the read output:
// 435→  });
// 436→    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
// It looks like line 436 is missing "app.delete('/api/user', async (req, res) => {" or similar.
// Actually, let's look at lines 430-449. 
// 435 is "  });" which closes the previous POST.
// 436 starts with "if (!req.isAuthenticated())" but there's no app.METHOD(...) wrapper.
// It seems a line was accidentally deleted or incorrectly replaced.

const brokenStart = '  });\n    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });';
const fixedStart = '  });\n\n  app.delete("/api/user", async (req, res) => {\n    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });';

if (routesContent.includes(brokenStart)) {
    routesContent = routesContent.replace(brokenStart, fixedStart);
    fs.writeFileSync(routesPath, routesContent);
    console.log('Fixed server/routes.ts');
} else {
    console.error('Could not find broken pattern in server/routes.ts');
}

// Fix client/src/components/knowledge-detail.tsx
const detailPath = 'client/src/components/knowledge-detail.tsx';
let detailContent = fs.readFileSync(detailPath, 'utf8');

// Add imports for Dialog components if missing
if (!detailContent.includes('Dialog,')) {
    detailContent = detailContent.replace(
        "import { Button } from \"@/components/ui/button\";",
        "import { Button } from \"@/components/ui/button\";\nimport { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from \"@/components/ui/dialog\";\nimport { RadioGroup, RadioGroupItem } from \"@/components/ui/radio-group\";\nimport { Label } from \"@/components/ui/label\";"
    );
}

// Add state
const statePattern = 'const [isRegenerating, setIsRegenerating] = useState(false);';
const newState = statePattern + '\n  const [difficulty, setDifficulty] = useState("same");\n  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);';
detailContent = detailContent.replace(statePattern, newState);

// Replace handleGenerateNew
const oldHandle = /const handleGenerateNew = \(\\) => \{[\s\S]*?setIsRegenerating\(true\);[\s\S]*?generateImplementationMutation\.mutate\(\{[\s\S]*?conceptId: id[\s\S]*?\}\, \{[\s\S]*?onSettled: \(\\) => setIsRegenerating\(false\)[\s\S]*?\}\);[\s\S]*?\};/;
const newHandle = `const handleGenerateNew = () => {
    setShowDifficultyDialog(true);
  };

  const confirmGenerateNew = () => {
    setShowDifficultyDialog(false);
    setIsRegenerating(true);
    generateImplementationMutation.mutate({
      conceptId: id,
      complexity: difficulty
    }, {
      onSettled: () => setIsRegenerating(false)
    });
  };`;
detailContent = detailContent.replace(oldHandle, newHandle);

// Add Dialog UI before the final return/render
const renderPattern = '<div className="flex gap-2 flex-wrap pt-4 border-t">';
const dialogUI = `
      <Dialog open={showDifficultyDialog} onOpenChange={setShowDifficultyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              How challenging should the next project be compared to your current progress?
            </p>
            <RadioGroup value={difficulty} onValueChange={setDifficulty} className="gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="easier" id="easier" />
                <Label htmlFor="easier">Easier - Focus on fundamentals</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="same" id="same" />
                <Label htmlFor="same">Same - Practice current level</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="advanced" id="advanced" />
                <Label htmlFor="advanced">Advanced - Push my boundaries</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDifficultyDialog(false)}>Cancel</Button>
            <Button onClick={confirmGenerateNew}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;
detailContent = detailContent.replace(renderPattern, dialogUI + '\n                      ' + renderPattern);

fs.writeFileSync(detailPath, detailContent);
console.log('Updated client/src/components/knowledge-detail.tsx');
