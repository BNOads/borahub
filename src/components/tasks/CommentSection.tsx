import { useState } from "react";
import { Send, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TaskComment } from "@/types/tasks";
import { useCreateComment, useDeleteComment } from "@/hooks/useTaskComments";
import { useToast } from "@/hooks/use-toast";

interface CommentSectionProps {
  taskId: string;
  comments: TaskComment[];
}

export function CommentSection({ taskId, comments }: CommentSectionProps) {
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [authorName, setAuthorName] = useState("Usuario");

  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await createComment.mutateAsync({
        task_id: taskId,
        author_name: authorName,
        content: newComment.trim(),
      });
      setNewComment("");
    } catch {
      toast({
        title: "Erro ao adicionar comentario",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ id: commentId, taskId });
    } catch {
      toast({
        title: "Erro ao excluir comentario",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Escreva um comentario..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={!newComment.trim() || createComment.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </div>
      </div>

      {sortedComments.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4">
          Nenhum comentario ainda
        </p>
      ) : (
        <div className="space-y-3">
          {sortedComments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 rounded-lg border border-border bg-muted/30 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{comment.author_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
