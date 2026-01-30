import { useRef, useEffect, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { cn } from "@/lib/utils";

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

  return (
    <div className={cn("meeting-rich-editor", className)}>
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
