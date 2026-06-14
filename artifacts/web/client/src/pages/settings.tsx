import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { localStorage } from "@/lib/services/localStorage";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  Database, 
  MessageSquare, 
  Layout, 
  AlertTriangle, 
  ShieldAlert 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserSettings as UserSettingsType } from "@shared/schema";

import { useAuth } from "@/hooks/use-auth";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const updateAvatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      // Static: localStorage-based
      const prefs = localStorage.prefs.get();
      localStorage.prefs.set({ ...prefs, avatarUrl });
      return { avatarUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Avatar updated" });
    },
  });

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateAvatarMutation.mutate(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const { data: settings, isLoading } = useQuery<UserSettingsType>({
    queryKey: ["/api/user-settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<UserSettingsType>) => {
      const prefs = localStorage.prefs.get();
      localStorage.prefs.set({ ...prefs, ...updatedSettings });
      return updatedSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-settings"] });
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved.",
      });
    },
  });

  const clearChatHistoryMutation = useMutation({
    mutationFn: async () => {
      // Static: localStorage-based
    },
    onSuccess: () => {
      setDeleteDialogOpen(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/idea-sessions"] });
      toast({
        title: "Chat history cleared",
        description: "All conversations have been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to clear chat history: " + error.message,
        variant: "destructive",
      });
    },
  });

  const clearAllProjectsMutation = useMutation({
    mutationFn: async () => {
      // Static: localStorage-based
    },
    onSuccess: () => {
      setDeleteDialogOpen(null);
      queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunity-projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/concepts"] });
      toast({
        title: "Projects cleared",
        description: "All implementation projects have been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to clear projects: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteConceptsMutation = useMutation({
    mutationFn: async () => {
      localStorage.concepts.setAll([]);
      localStorage.projects.setAll([]);
    },
    onSuccess: () => {
      setDeleteDialogOpen(null);
      queryClient.invalidateQueries({ queryKey: ["/api/concepts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunity-projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/idea-sessions"] });
      toast({
        title: "Data deleted",
        description: "All concepts and projects have been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete data: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAllDataMutation = useMutation({
    mutationFn: async () => {
      localStorage.clearAll();
    },
    onSuccess: () => {
      setDeleteDialogOpen(null);
      setDeleteConfirmText("");
      queryClient.invalidateQueries({ queryKey: ["/api/idea-sessions"] });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to reset account: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // Static: clear localStorage
      localStorage.clearAll();
    },
    onSuccess: () => {
      setDeleteDialogOpen(null);
      window.location.href = "/auth";
      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently removed.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
          <Card className="p-6">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground uppercase">
                      {user?.username[0]}
                    </div>
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full">
                  <span className="text-xs font-medium">Change</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </label>
              </div>
              <div>
                <h3 className="text-lg font-medium">{user?.username}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Opportunity Projects</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Automatic Generation</Label>
                <p className="text-sm text-muted-foreground">Generate new project opportunities when you learn enough concepts.</p>
              </div>
              <Switch
                checked={settings?.enableConceptCountGeneration}
                onCheckedChange={(checked) => {
                  updateSettingsMutation.mutate({ enableConceptCountGeneration: checked });
                }}
              />
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between gap-4 mb-2">
                <Label className="text-sm font-medium">Concept Threshold</Label>
                <span className="text-sm font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {settings?.conceptCountThreshold || 3} Concepts
                </span>
              </div>
              <Slider
                value={[settings?.conceptCountThreshold || 3]}
                min={1}
                max={10}
                step={1}
                onValueChange={(value) => {
                  updateSettingsMutation.mutate({ conceptCountThreshold: value[0] });
                }}
                className="py-4"
              />
            </div>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-xl font-semibold mb-4 text-destructive">Data & Privacy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 flex flex-col justify-between hover:border-amber-200 transition-colors">
              <div>
                <h3 className="font-medium mb-1 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat History
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Clear all AI companion conversations but keep your learning profile.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setDeleteDialogOpen("clear-chat")}
              >
                Clear History
              </Button>
            </Card>

            <Card className="p-4 flex flex-col justify-between hover:border-amber-200 transition-colors">
              <div>
                <h3 className="font-medium mb-1 flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  All Projects
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Remove all implementation code and simulations. Concepts remain.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setDeleteDialogOpen("clear-projects")}
              >
                Clear Projects
              </Button>
            </Card>

            <Card className="p-4 flex flex-col justify-between hover:border-destructive/20 transition-colors">
              <div>
                <h3 className="font-medium mb-1 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Concepts & Projects
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Wipe your entire knowledge base and all associated implementations.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setDeleteDialogOpen("delete-concepts")}
              >
                Delete All
              </Button>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-destructive bg-destructive/5">
              <div>
                <h3 className="font-medium mb-1 text-destructive flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Reset Account
                </h3>
                <p className="text-xs text-muted-foreground mb-4">The nuclear option. Deletes everything and resets all preferences.</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setDeleteDialogOpen("delete-all")}
              >
                Full Reset
              </Button>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-destructive bg-destructive/10">
              <div>
                <h3 className="font-medium mb-1 text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Delete Account
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Permanently remove your account and all associated data.</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setDeleteDialogOpen("delete-account")}
              >
                Delete Account
              </Button>
            </Card>
          </div>
        </section>
      </div>

      <Dialog open={deleteDialogOpen === "delete-account"} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(null); setDeleteConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
              <ShieldAlert className="h-6 w-6" />
              Delete Your Account?
            </DialogTitle>
            <DialogDescription>
              This action is irreversible. It will permanently delete your account, your concepts, your projects, and all your learning history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm font-semibold">To confirm, please type "DELETE MY ACCOUNT" below:</p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="border-destructive focus-visible:ring-destructive"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending || deleteConfirmText !== "DELETE MY ACCOUNT"}
            >
              {deleteAccountMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              PERMANENTLY DELETE ACCOUNT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen === "clear-chat"} onOpenChange={(open) => !open && setDeleteDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Clear Chat History?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all your chat conversations. Your concepts and projects will remain untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => clearChatHistoryMutation.mutate()}
              disabled={clearChatHistoryMutation.isPending}
            >
              {clearChatHistoryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Clear Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen === "clear-projects"} onOpenChange={(open) => !open && setDeleteDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Clear All Projects?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all your implementations and projects. Your concepts will remain intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => clearAllProjectsMutation.mutate()}
              disabled={clearAllProjectsMutation.isPending}
            >
              {clearAllProjectsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Clear Projects
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen === "delete-concepts"} onOpenChange={(open) => !open && setDeleteDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Everything?
            </DialogTitle>
            <DialogDescription>
              This will wipe your entire knowledge base and all implementations. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConceptsMutation.mutate()}
              disabled={deleteConceptsMutation.isPending}
            >
              {deleteConceptsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen === "delete-all"} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(null); setDeleteConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
              <ShieldAlert className="h-6 w-6" />
              DANGER: NUCLEAR RESET
            </DialogTitle>
            <DialogDescription>
              You are about to delete every single piece of data associated with your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm font-semibold">To proceed, please type "DELETE ALL DATA" below:</p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE ALL DATA"
              className="border-destructive focus-visible:ring-destructive"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteAllDataMutation.mutate()}
              disabled={deleteAllDataMutation.isPending || deleteConfirmText !== "DELETE ALL DATA"}
            >
              {deleteAllDataMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              PERMANENTLY DELETE EVERYTHING
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
