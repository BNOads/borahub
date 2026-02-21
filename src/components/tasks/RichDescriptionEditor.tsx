import { useRef, useCallback, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Paperclip, Image, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RichDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

async function uploadFile(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const filePath = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("task-attachments")
    .upload(filePath, file);

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data } = supabase.storage
    .from("task-attachments")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export function RichDescriptionEditor({
  value,
  onChange,
  placeholder = "Descrição da tarefa...\n\nCole imagens (Ctrl+V) ou use os botões para anexar.",
  rows = 4,
  className,
}: RichDescriptionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        onChange(value + text);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.slice(0, start) + text + value.slice(end);
      onChange(newValue);

      // Restore cursor position after state update
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
      });
    },
    [value, onChange]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const url = await uploadFile(file);
        if (!url) {
          toast.error("Erro ao fazer upload");
          return;
        }

        if (isImageFile(file)) {
          insertAtCursor(`\n![${file.name}](${url})\n`);
        } else {
          insertAtCursor(`\n[📎 ${file.name}](${url})\n`);
        }
        toast.success("Arquivo anexado!");
      } catch {
        toast.error("Erro ao fazer upload");
      } finally {
        setUploading(false);
      }
    },
    [insertAtCursor]
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleUpload(file);
          }
          return;
        }
      }
      // Let text paste happen normally
    },
    [handleUpload]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) await handleUpload(file);
      e.target.value = "";
    },
    [handleUpload]
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={rows}
          className={cn(uploading && "opacity-60", className)}
          disabled={uploading}
        />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Enviando...</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading}
          className="text-xs"
        >
          <Image className="h-3.5 w-3.5 mr-1" /> Imagem
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs"
        >
          <Paperclip className="h-3.5 w-3.5 mr-1" /> Arquivo
        </Button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
