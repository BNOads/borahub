import { useRef, useEffect, useMemo, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { cn } from "@/lib/utils";
import { HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getMediaInfo } from "@/lib/videoUtils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (selection: { text: string; index: number; length: number } | null) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onSelectionChange,
  placeholder = "Digite aqui...",
  className,
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [drivePopoverOpen, setDrivePopoverOpen] = useState(false);

  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
      ["clean"],
    ],
  }), []);

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "list",
    "bullet",
    "link",
  ];

  useEffect(() => {
    if (quillRef.current && onSelectionChange) {
      const editor = quillRef.current.getEditor();
      
      const handleSelectionChange = (range: { index: number; length: number } | null) => {
        if (range && range.length > 0) {
          const text = editor.getText(range.index, range.length);
          onSelectionChange({ text: text.trim(), index: range.index, length: range.length });
        } else {
          onSelectionChange(null);
        }
      };

      editor.on("selection-change", handleSelectionChange);
      return () => {
        editor.off("selection-change", handleSelectionChange);
      };
    }
  }, [onSelectionChange]);

  const handleEmbedDrive = () => {
    if (!driveUrl || !quillRef.current) return;
    
    const mediaInfo = getMediaInfo(driveUrl);
    if (mediaInfo.type === "google-drive" && mediaInfo.embedUrl) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);
      
      // Insert a clickable link with a special marker for Drive embeds
      const embedHtml = `<a href="${mediaInfo.embedUrl}" target="_blank" rel="noopener noreferrer">📁 Arquivo do Google Drive</a>`;
      editor.clipboard.dangerouslyPasteHTML(range.index, embedHtml);
      
      setDriveUrl("");
      setDrivePopoverOpen(false);
    }
  };

  return (
    <div className={cn("meeting-rich-editor", className)}>
      {/* Custom toolbar with Drive embed button */}
      <div className="flex items-center gap-1 pb-1 border-b border-border mb-1">
        <Popover open={drivePopoverOpen} onOpenChange={setDrivePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="Embedar arquivo do Google Drive"
            >
              <HardDrive className="h-4 w-4 text-muted-foreground hover:text-primary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium">Embedar arquivo do Google Drive</p>
              <Input
                placeholder="Cole o link do Google Drive..."
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEmbedDrive();
                  }
                }}
              />
              <Button size="sm" onClick={handleEmbedDrive} className="w-full">
                Inserir
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
      <style>{`
        .meeting-rich-editor .ql-container {
          border: none !important;
          font-size: 1rem;
          min-height: 80px;
        }
        .meeting-rich-editor .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
          padding: 4px 0;
          background: transparent;
        }
        .meeting-rich-editor .ql-toolbar .ql-stroke {
          stroke: hsl(var(--muted-foreground));
        }
        .meeting-rich-editor .ql-toolbar .ql-fill {
          fill: hsl(var(--muted-foreground));
        }
        .meeting-rich-editor .ql-toolbar .ql-picker {
          color: hsl(var(--muted-foreground));
        }
        .meeting-rich-editor .ql-toolbar button:hover .ql-stroke,
        .meeting-rich-editor .ql-toolbar .ql-picker:hover .ql-stroke {
          stroke: hsl(var(--primary));
        }
        .meeting-rich-editor .ql-toolbar button:hover .ql-fill,
        .meeting-rich-editor .ql-toolbar .ql-picker:hover .ql-fill {
          fill: hsl(var(--primary));
        }
        .meeting-rich-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: hsl(var(--primary));
        }
        .meeting-rich-editor .ql-toolbar button.ql-active .ql-fill {
          fill: hsl(var(--primary));
        }
        .meeting-rich-editor .ql-editor {
          padding: 12px 0;
          color: hsl(var(--foreground));
        }
        .meeting-rich-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        .meeting-rich-editor .ql-editor a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .meeting-rich-editor .ql-snow .ql-tooltip {
          background-color: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--popover-foreground));
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .meeting-rich-editor .ql-snow .ql-tooltip input[type="text"] {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          border-radius: 4px;
        }
        .meeting-rich-editor .ql-snow .ql-tooltip a.ql-action,
        .meeting-rich-editor .ql-snow .ql-tooltip a.ql-remove {
          color: hsl(var(--primary));
        }
        .meeting-rich-editor .ql-picker-options {
          background-color: hsl(var(--popover)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 6px;
        }
        .meeting-rich-editor .ql-picker-item {
          color: hsl(var(--popover-foreground)) !important;
        }
        .meeting-rich-editor .ql-picker-item:hover {
          background-color: hsl(var(--accent)) !important;
        }
      `}</style>
    </div>
  );
}
