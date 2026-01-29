import { useState, useRef, useEffect, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MeetingBlock as MeetingBlockType } from "@/hooks/useMeetings";
import { useUpdateBlock, useDeleteBlock } from "@/hooks/useMeetingBlocks";

interface MeetingBlockProps {
  block: MeetingBlockType;
  meetingId: string;
  onConvertToTask: (block: MeetingBlockType) => void;
}

export function MeetingBlock({ block, meetingId, onConvertToTask }: MeetingBlockProps) {
  const [content, setContent] = useState(block.content);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateBlock = useUpdateBlock();
  const deleteBlock = useDeleteBlock();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(80, textarea.scrollHeight)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // Debounced save
  const handleContentChange = (value: string) => {
    setContent(value);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(() => {
      updateBlock.mutate(
        { id: block.id, meetingId, content: value },
        {
          onSuccess: () => setIsSaving(false),
          onError: () => setIsSaving(false),
        }
      );
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleDelete = () => {
    if (content.trim() && !confirm("Tem certeza que deseja remover este bloco?")) {
      return;
    }
    deleteBlock.mutate({ id: block.id, meetingId });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-card p-4 transition-all",
        isDragging && "opacity-50 shadow-lg",
        block.linked_task_id && "border-l-4 border-l-primary"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="ml-6">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Digite o assunto aqui..."
          className="min-h-[80px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-base"
        />

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isSaving ? (
              <span className="animate-pulse">Salvando...</span>
            ) : (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                Salvo automaticamente
              </span>
            )}
            {block.linked_task_id && (
              <span className="flex items-center gap-1 text-primary">
                <CheckCircle2 className="h-3 w-3" />
                Tarefa vinculada
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!block.linked_task_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onConvertToTask(block)}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Criar Tarefa
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
