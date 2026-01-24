import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Simple markdown renderer that handles:
 * - **bold** text
 * - *italic* text
 * - > blockquotes
 * - --- horizontal rules
 * - Numbered lists (1. 2. 3.)
 * - Bullet lists (- or *)
 * - Line breaks
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const renderedContent = useMemo(() => {
    if (!content) return null;

    // Split by lines to process block elements
    const lines = content.split("\n");
    const elements: JSX.Element[] = [];
    let currentList: { type: "ol" | "ul"; items: string[] } | null = null;
    let currentBlockquote: string[] | null = null;

    const processInlineMarkdown = (text: string): React.ReactNode => {
      // Process bold and italic
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let key = 0;

      while (remaining.length > 0) {
        // Bold: **text**
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        // Italic: *text* (but not **)
        const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

        const boldIndex = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
        const italicIndex = italicMatch ? remaining.indexOf(italicMatch[0]) : -1;

        let firstMatch: { index: number; match: RegExpMatchArray; type: "bold" | "italic" } | null = null;

        if (boldIndex !== -1 && (italicIndex === -1 || boldIndex <= italicIndex)) {
          firstMatch = { index: boldIndex, match: boldMatch!, type: "bold" };
        } else if (italicIndex !== -1) {
          firstMatch = { index: italicIndex, match: italicMatch!, type: "italic" };
        }

        if (firstMatch) {
          // Add text before match
          if (firstMatch.index > 0) {
            parts.push(remaining.substring(0, firstMatch.index));
          }

          // Add formatted text
          if (firstMatch.type === "bold") {
            parts.push(
              <strong key={key++} className="font-bold">
                {firstMatch.match[1]}
              </strong>
            );
          } else {
            parts.push(
              <em key={key++} className="italic">
                {firstMatch.match[1]}
              </em>
            );
          }

          remaining = remaining.substring(firstMatch.index + firstMatch.match[0].length);
        } else {
          parts.push(remaining);
          remaining = "";
        }
      }

      return parts.length > 0 ? parts : text;
    };

    const flushList = () => {
      if (currentList) {
        const ListTag = currentList.type;
        elements.push(
          <ListTag
            key={elements.length}
            className={cn(
              "my-2 space-y-1",
              currentList.type === "ol" ? "list-decimal list-inside" : "list-disc list-inside"
            )}
          >
            {currentList.items.map((item, i) => (
              <li key={i}>{processInlineMarkdown(item)}</li>
            ))}
          </ListTag>
        );
        currentList = null;
      }
    };

    const flushBlockquote = () => {
      if (currentBlockquote) {
        elements.push(
          <blockquote
            key={elements.length}
            className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-3"
          >
            {currentBlockquote.map((line, i) => (
              <p key={i}>{processInlineMarkdown(line)}</p>
            ))}
          </blockquote>
        );
        currentBlockquote = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Horizontal rule
      if (trimmedLine === "---" || trimmedLine === "***" || trimmedLine === "___") {
        flushList();
        flushBlockquote();
        elements.push(<hr key={elements.length} className="my-4 border-border" />);
        continue;
      }

      // Blockquote
      if (trimmedLine.startsWith(">")) {
        flushList();
        const quoteContent = trimmedLine.substring(1).trim();
        if (!currentBlockquote) {
          currentBlockquote = [];
        }
        currentBlockquote.push(quoteContent);
        continue;
      } else {
        flushBlockquote();
      }

      // Numbered list (1. 2. 3.)
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        if (!currentList || currentList.type !== "ol") {
          flushList();
          currentList = { type: "ol", items: [] };
        }
        currentList.items.push(numberedMatch[2]);
        continue;
      }

      // Bullet list (- or *)
      const bulletMatch = trimmedLine.match(/^[-*]\s+(.*)$/);
      if (bulletMatch) {
        if (!currentList || currentList.type !== "ul") {
          flushList();
          currentList = { type: "ul", items: [] };
        }
        currentList.items.push(bulletMatch[1]);
        continue;
      }

      // Regular text - flush any pending list
      flushList();

      // Empty line = paragraph break
      if (trimmedLine === "") {
        elements.push(<div key={elements.length} className="h-3" />);
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={elements.length} className="leading-relaxed">
          {processInlineMarkdown(trimmedLine)}
        </p>
      );
    }

    // Flush any remaining list or blockquote
    flushList();
    flushBlockquote();

    return elements;
  }, [content]);

  return (
    <div className={cn("space-y-2", className)}>
      {renderedContent}
    </div>
  );
}
