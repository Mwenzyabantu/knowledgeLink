import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { localStorage } from "@/lib/services/localStorage";
import { generateChatResponse } from "@/lib/services/supabase";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Send, Loader2, Edit2, Check, X, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ChatSession, ChatMessage } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AICompanion() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [userMessage, setUserMessage] = useState("");
  const [editingTags, setEditingTags] = useState(false);
  const [tempTags, setTempTags] = useState("");
  const [messagesCollapsed, setMessagesCollapsed] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sessions = [], isLoading } = useQuery<ChatSession[]>({
    queryKey: ["/api/chat-sessions"],
  });

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: selectedSession ? [`/api/chat-sessions/${selectedSession}/messages`] : [],
    enabled: !!selectedSession,
  });

  const updateTagsMutation = useMutation({
    mutationFn: async ({ sessionId, tags }: { sessionId: number; tags: string[] }) => {
      // Static: no-op for now
      return { tags };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
      setEditingTags(false);
      toast({
        title: "Tags updated",
        description: "Session tags have been updated successfully.",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedSession) return;
      const history = messages.map((msg) => ({ role: msg.role, content: msg.content }));
      const response = await generateChatResponse(message, history);
      return { response };
    },
    onSuccess: () => {
      if (selectedSession) {
        queryClient.invalidateQueries({ queryKey: [`/api/chat-sessions/${selectedSession}/messages`] });
      }
      setUserMessage("");
      setLastFailedMessage(null);
    },
    onError: (_err, message) => {
      setLastFailedMessage(message);
    },
  });

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (session) =>
        session.type.toLowerCase().includes(query) ||
        (session.tags && session.tags.some((tag) => tag.toLowerCase().includes(query)))
    );
  }, [sessions, searchQuery]);

  const selectedSessionData = useMemo(() => {
    return sessions.find((s) => s.id === selectedSession);
  }, [sessions, selectedSession]);

  const handleSelectSession = (sessionId: number) => {
    setSelectedSession(sessionId);
    setEditingTags(false);
  };

  const handleSendMessage = () => {
    if (!userMessage.trim() || !selectedSession) return;
    setLastFailedMessage(null);
    sendMessageMutation.mutate(userMessage);
  };

  const handleRetry = () => {
    if (!lastFailedMessage || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(lastFailedMessage);
  };

  const handleSaveTags = () => {
    if (!selectedSession) return;
    const tags = tempTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    
    if (tags.length === 0) {
      toast({
        title: "Tags required",
        description: "Please add at least one tag to the conversation.",
        variant: "destructive",
      });
      return;
    }
    
    updateTagsMutation.mutate({ sessionId: selectedSession, tags });
  };

  const handleEditTags = () => {
    if (selectedSessionData) {
      setTempTags((selectedSessionData.tags || []).join(", "));
      setEditingTags(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-screen flex flex-col">
      <div className="py-8">
        <h1 className="text-4xl font-bold mb-2 tracking-tight">AI Companion</h1>
        <p className="text-base text-muted-foreground">
          Your conversation history and saved discussions
        </p>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="w-80 flex flex-col border-r pr-6">
          <div className="relative mb-4">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search sessions..."
              className="pl-6 border-0 border-b rounded-none focus-visible:ring-0 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-sessions"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading sessions...</p>
            ) : filteredSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              filteredSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-md border hover-elevate active-elevate-2 transition-colors",
                    selectedSession === session.id && "bg-muted"
                  )}
                  data-testid={`session-${session.id}`}
                >
                  <div className="text-sm font-medium mb-1 capitalize">
                    {session.type.replace("_", " ")}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {session.tags && session.tags.length > 0 ? (
                      session.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No tags</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedSession ? (
            <>
              <div className="border-b pb-4 mb-6">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h2 className="text-2xl font-semibold capitalize">
                    {selectedSessionData?.type.replace("_", " ")}
                  </h2>
                  {!editingTags && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditTags}
                      data-testid="button-edit-tags"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Tags
                    </Button>
                  )}
                </div>
                {editingTags ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="tag1, tag2, tag3..."
                      value={tempTags}
                      onChange={(e) => setTempTags(e.target.value)}
                      className="text-sm"
                      data-testid="input-edit-tags"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSaveTags}
                      disabled={updateTagsMutation.isPending}
                      data-testid="button-save-tags"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingTags(false)}
                      data-testid="button-cancel-tags"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedSessionData?.tags && selectedSessionData.tags.length > 0 ? (
                      selectedSessionData.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">No tags added</span>
                    )}
                  </div>
                )}
              </div>

              {messages.length > 0 && (
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMessagesCollapsed(!messagesCollapsed)}
                    className="-ml-3"
                    data-testid="button-toggle-messages"
                  >
                    {messagesCollapsed ? (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Show Conversation
                      </>
                    ) : (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Hide Conversation
                      </>
                    )}
                  </Button>
                </div>
              )}

              {!messagesCollapsed && (
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                        data-testid={`message-${msg.id}`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {lastFailedMessage && !sendMessageMutation.isPending && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleRetry}
                        className="flex items-center gap-1.5 text-xs text-destructive border border-destructive/30 rounded-full px-3 py-1 hover:bg-destructive/10 transition-colors"
                        data-testid="button-retry-message"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Request failed — retry
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1 border-b-2 border-border focus-within:border-primary transition-colors">
                  <textarea
                    placeholder="Continue the conversation..."
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="w-full resize-none bg-transparent border-0 focus:outline-none text-sm p-0 placeholder:text-muted-foreground placeholder:italic min-h-[60px]"
                    data-testid="input-message"
                  />
                </div>
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!userMessage.trim() || sendMessageMutation.isPending}
                  data-testid="button-send"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Select a conversation to continue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
