import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateStoryDialog = ({ open, onOpenChange }: CreateStoryDialogProps) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCreateStory = async () => {
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your story",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        content: content.trim(),
        story_type: "text",
      });

      if (error) throw error;

      toast({
        title: "Story created",
        description: "Your story has been posted successfully",
      });
      
      setContent("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Share something with your friends..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button 
            onClick={handleCreateStory} 
            disabled={isSubmitting || !content.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Story"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
