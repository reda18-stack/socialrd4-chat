import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

export const NewConversationDialog = ({ open, onOpenChange, onConversationCreated }: NewConversationDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", user.id)
      .order("username");

    if (data) setUsers(data);
  };

  const handleCreateConversation = async (otherUserId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if conversation already exists
      const { data: existingMembers } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (existingMembers) {
        for (const member of existingMembers) {
          const { data: otherMembers } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", member.conversation_id);

          if (otherMembers?.length === 2 && otherMembers.some(m => m.user_id === otherUserId)) {
            onConversationCreated(member.conversation_id);
            onOpenChange(false);
            return;
          }
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          is_group: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add members
      const { error: membersError } = await supabase
        .from("conversation_members")
        .insert([
          { conversation_id: conversation.id, user_id: user.id },
          { conversation_id: conversation.id, user_id: otherUserId },
        ]);

      if (membersError) throw membersError;

      toast({
        title: "Conversation started",
        description: "You can now start chatting",
      });

      onConversationCreated(conversation.id);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleCreateConversation(user.id)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    {user.status === "online" && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.status}</p>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
