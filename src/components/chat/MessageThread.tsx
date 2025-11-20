import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Phone, Video, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TypingIndicator } from "./TypingIndicator";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    username: string;
    avatar_url: string | null;
  };
}

interface PresenceState {
  user_id: string;
  typing: boolean;
  online_at: string;
}

interface MessageThreadProps {
  conversationId: string | null;
}

export const MessageThread = ({ conversationId }: MessageThreadProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, any>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      subscribeToMessages();
      setupPresence();
    }
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadMessages = async () => {
    if (!conversationId) return;

    const { data } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles(username, avatar_url)
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  };

  const subscribeToMessages = () => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const setupPresence = async () => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`presence:${conversationId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const typing: Record<string, PresenceState> = {};
        
        Object.keys(state).forEach((key) => {
          if (key !== currentUserId) {
            const presences = state[key];
            if (presences && presences.length > 0) {
              const presence = presences[0] as PresenceState;
              if (presence.typing) {
                typing[key] = presence;
              }
            }
          }
        });
        
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUserId,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!channelRef.current || !currentUserId) return;

    await channelRef.current.track({
      user_id: currentUserId,
      typing: isTyping,
      online_at: new Date().toISOString(),
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Update typing status to true
    updateTypingStatus(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing status after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !currentUserId) return;

    // Clear typing status before sending
    updateTypingStatus(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: newMessage.trim(),
    });

    if (!error) {
      setNewMessage("");
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-2">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-semibold">Select a conversation</h3>
          <p className="text-muted-foreground">Choose a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground">U</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">Conversation</h3>
            <p className="text-sm text-muted-foreground">Active now</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="rounded-full">
            <Phone className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="ghost" className="rounded-full">
            <Video className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="ghost" className="rounded-full">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isOwn && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={message.sender?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">
                      {message.sender?.username[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isOwn
                        ? "bg-chat-sent text-primary-foreground rounded-br-sm"
                        : "bg-chat-received text-foreground rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm break-words">{message.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
          
          {/* Typing Indicator */}
          {Object.keys(typingUsers).length > 0 && (
            <TypingIndicator />
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t bg-card">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 rounded-full"
          />
          <Button type="submit" size="icon" className="rounded-full" disabled={!newMessage.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
};