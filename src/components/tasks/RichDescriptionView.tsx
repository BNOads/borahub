import { useMemo } from "react";
import { ExternalLink } from "lucide-react";

interface RichDescriptionViewProps {
  description: string;
}

// Parse markdown-style images and links from description
function parseDescription(text: string) {
  const parts: Array<{ type: "text" | "image" | "link"; content: string; url?: string; alt?: string }> = [];
  
  // Regex for ![alt](url) and [text](url)
  const regex = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      // Image: ![alt](url)
      parts.push({ type: "image", content: match[1], url: match[2], alt: match[1] });
    } else {
      // Link: [text](url)
      parts.push({ type: "link", content: match[3], url: match[4] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return parts;
}

export function RichDescriptionView({ description }: RichDescriptionViewProps) {
  const parts = useMemo(() => parseDescription(description), [description]);

  return (
    <div className="text-sm text-muted-foreground space-y-2">
      {parts.map((part, i) => {
        if (part.type === "image") {
          return (
            <a key={i} href={part.url} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={part.url}
                alt={part.alt || ""}
                className="max-w-full max-h-64 rounded-md border object-contain cursor-pointer hover:opacity-90 transition-opacity"
              />
            </a>
          );
        }
        if (part.type === "link") {
          return (
            <a
              key={i}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {part.content} <ExternalLink className="h-3 w-3" />
            </a>
          );
        }
        // Text
        return part.content ? (
          <span key={i} className="whitespace-pre-wrap">{part.content}</span>
        ) : null;
      })}
    </div>
  );
}
