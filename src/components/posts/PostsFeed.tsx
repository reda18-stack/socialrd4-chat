import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface Post {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  user?: {
    username: string;
    avatar_url: string | null;
  };
}

export const PostsFeed = () => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    loadPosts();
    subscribeToPosts();
  }, []);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select(`
        *,
        user:profiles(username, avatar_url)
      `)
      .order("created_at", { ascending: false });

    if (data) setPosts(data);
  };

  const subscribeToPosts = () => {
    const channel = supabase
      .channel("posts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleLike = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id: postId, user_id: user.id });

    if (!error) {
      loadPosts();
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={post.user?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {post.user?.username[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold">{post.user?.username || "User"}</h4>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="rounded-full">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{post.content}</p>
          </CardContent>
          <Separator />
          <CardFooter className="pt-4">
            <div className="flex items-center gap-1 w-full">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => handleLike(post.id)}
              >
                <Heart className="w-5 h-5" />
                <span>{post.likes_count}</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 gap-2">
                <MessageCircle className="w-5 h-5" />
                <span>Comment</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 gap-2">
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};