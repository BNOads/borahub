import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAddTicketComment, useUploadTicketAnexo } from "@/hooks/useTickets";
import { Paperclip, Send } from "lucide-react";
import { toast } from "sonner";

export function TicketCommentForm({ ticketId }: { ticketId: string }) {
  const [comment, setComment] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const addComment = useAddTicketComment();
  const uploadAnexo = useUploadTicketAnexo();

  const handleSend = async () => {
    if (!comment.trim()) return;
    try {
      await addComment.mutateAsync({ ticketId, descricao: comment.trim() });
      setComment("");
    } catch {
      toast.error("Erro ao adicionar comentário");
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAnexo.mutateAsync({ ticketId, file });
      toast.success("Arquivo anexado!");
    } catch {
      toast.error("Erro ao anexar arquivo");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Escreva um comentário..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSend} disabled={addComment.isPending || !comment.trim()}>
          <Send className="h-4 w-4 mr-1" /> Enviar
        </Button>
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadAnexo.isPending}>
          <Paperclip className="h-4 w-4 mr-1" /> Anexar
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}
