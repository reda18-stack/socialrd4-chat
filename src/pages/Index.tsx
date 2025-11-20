import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ConversationsList } from "@/components/chat/ConversationsList";
import { MessageThread } from "@/components/chat/MessageThread";
import { StoriesSection } from "@/components/stories/StoriesSection";
import { PostsFeed } from "@/components/posts/PostsFeed";
import { MessageCircle, History, Newspaper, LogOut } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
    } else {
      navigate("/auth");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <div className="h-16 border-b flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">SocialChat</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="messages" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b bg-card h-14">
          <TabsTrigger value="messages" className="flex-1 gap-2">
            <MessageCircle className="w-5 h-5" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="stories" className="flex-1 gap-2">
            <History className="w-5 h-5" />
            <span className="hidden sm:inline">Stories</span>
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex-1 gap-2">
            <Newspaper className="w-5 h-5" />
            <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="flex-1 mt-0">
          <div className="h-full grid grid-cols-1 md:grid-cols-3">
            <div className="md:col-span-1 border-r">
              <ConversationsList
                onSelectConversation={setSelectedConversation}
                selectedConversationId={selectedConversation}
              />
            </div>
            <div className="md:col-span-2">
              <MessageThread conversationId={selectedConversation} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stories" className="flex-1 mt-0 p-4">
          <div className="max-w-6xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold">Stories</h2>
            <StoriesSection />
          </div>
        </TabsContent>

        <TabsContent value="posts" className="flex-1 mt-0 overflow-auto">
          <div className="max-w-2xl mx-auto p-4 space-y-4">
            <h2 className="text-2xl font-bold">Posts</h2>
            <PostsFeed />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;