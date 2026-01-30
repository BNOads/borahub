import { useState, useRef, useEffect, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  GripVertical, 
  Plus, 
  CheckCircle2, 
  Trash2,
  ListTodo
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MeetingBlock as MeetingBlockType } from "@/hooks/useMeetings";
import { useUpdateBlock, useDeleteBlock } from "@/hooks/useMeetingBlocks";
import { RichTextEditor } from "./RichTextEditor";

interface MeetingBlockProps {
  block: MeetingBlockType;
  meetingId: string;
  onConvertToTask: (block: MeetingBlockType) => void;
}

// Helper to strip HTML tags from content for task creation
function stripHtml(html: string): string {
  if (!html) return "";
  const withLineBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n");
  const textOnly = withLineBreaks.replace(/<[^>]*>/g, "");
  const textarea = document.createElement("textarea");
  textarea.innerHTML = textOnly;
  return textarea.value.trim();
}

export function MeetingBlock({ block, meetingId, onConvertToTask }: MeetingBlockProps) {
  const [content, setContent] = useState(block.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Sync content from props
  useEffect(() => {
    setContent(block.content);
  }, [block.content]);

  // Debounced save
  const saveContent = useCallback((value: string) => {
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
  }, [block.id, meetingId, updateBlock]);

  const handleChange = (value: string) => {
    setContent(value);
    saveContent(value);
  };

  const handleSelectionChange = (selection: { text: string; index: number; length: number } | null) => {
    if (selection && selection.text.length > 0) {
      setSelectedText(selection.text);
      setShowToolbar(true);
    } else {
      setShowToolbar(false);
      setSelectedText("");
    }
  };

  // Hide toolbar on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current && 
        !toolbarRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowToolbar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleCreateTaskFromSelection = () => {
    if (selectedText) {
      const tempBlock = { ...block, content: selectedText };
      onConvertToTask(tempBlock);
      setShowToolbar(false);
    }
  };

  const handleDelete = () => {
    const plainContent = stripHtml(content);
    if (plainContent && !confirm("Tem certeza que deseja remover este bloco?")) {
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
      <div ref={containerRef} className="ml-6 relative">
        {/* Floating Toolbar for Selection */}
        {showToolbar && selectedText && (
          <div
            ref={toolbarRef}
            className="absolute z-50 flex items-center gap-1 bg-popover border rounded-lg shadow-lg p-1 -top-10 left-0"
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1 text-primary"
              onClick={handleCreateTaskFromSelection}
            >
              <ListTodo className="h-4 w-4" />
              <span className="text-xs">Criar Tarefa</span>
            </Button>
          </div>
        )}

        {/* Rich Text Editor */}
        <RichTextEditor
          value={content}
          onChange={handleChange}
          onSelectionChange={handleSelectionChange}
          placeholder="Digite o assunto aqui..."
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
