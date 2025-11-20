import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Story {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    username: string;
    avatar_url: string | null;
  };
}

export const StoriesSection = () => {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    loadStories();
    subscribeToStories();
  }, []);

  const loadStories = async () => {
    const { data } = await supabase
      .from("stories")
      .select(`
        *,
        user:profiles(username, avatar_url)
      `)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (data) setStories(data);
  };

  const subscribeToStories = () => {
    const channel = supabase
      .channel("stories")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stories",
        },
        () => {
          loadStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <Card className="p-4">
      <ScrollArea className="w-full">
        <div className="flex gap-4">
          {/* Add Story Button */}
          <div className="flex-shrink-0">
            <div className="relative cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent p-0.5">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <p className="text-xs text-center mt-1 font-medium">Add Story</p>
            </div>
          </div>

          {/* Stories */}
          {stories.map((story) => (
            <div key={story.id} className="flex-shrink-0">
              <div className="relative cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] p-0.5">
                  <Avatar className="w-full h-full border-2 border-background">
                    <AvatarImage src={story.user?.avatar_url || ""} />
                    <AvatarFallback>{story.user?.username[0] || "U"}</AvatarFallback>
                  </Avatar>
                </div>
                <p className="text-xs text-center mt-1 font-medium truncate max-w-[64px]">
                  {story.user?.username || "User"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};