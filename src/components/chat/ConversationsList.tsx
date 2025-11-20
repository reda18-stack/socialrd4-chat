import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NewConversationDialog } from "./NewConversationDialog";

interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  updated_at: string;
  lastMessage?: {
    content: string;
    created_at: string;
  };
  otherUser?: {
    username: string;
    avatar_url: string | null;
    status: string;
  };
}

interface ConversationsListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
}

export const ConversationsList = ({ onSelectConversation, selectedConversationId }: ConversationsListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberData } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!memberData) return;

    const conversationIds = memberData.map(m => m.conversation_id);

    const { data: conversations } = await supabase
      .from("conversations")
      .select("*")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false });

    if (conversations) {
      setConversations(conversations);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="h-full flex flex-col bg-card border-r">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Chats</h2>
            <Button 
              size="icon" 
              variant="ghost" 
              className="rounded-full"
              onClick={() => setIsNewConversationOpen(true)}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredConversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b ${
              selectedConversationId === conversation.id ? "bg-muted" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar>
                  <AvatarImage src={conversation.otherUser?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {conversation.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                {conversation.otherUser?.status === "online" && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold truncate">
                    {conversation.name || "Unknown"}
                  </h3>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                  </span>
                </div>
                {conversation.lastMessage && (
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage.content}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
    <NewConversationDialog
      open={isNewConversationOpen}
      onOpenChange={setIsNewConversationOpen}
      onConversationCreated={onSelectConversation}
    />
    </>
  );
};