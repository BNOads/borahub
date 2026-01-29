import { useState } from "react";
import { Pencil, StickyNote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NotePanel } from "./NotePanel";
import { useUserNote, useSaveNote } from "@/hooks/useUserNotes";
import { cn } from "@/lib/utils";

export function NoteWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: note, isLoading } = useUserNote();
  const saveNote = useSaveNote();

  const handleSave = (content: string) => {
    saveNote.mutate(content);
  };

  const hasContent = note?.content && note.content.trim().length > 0;
  const previewText = note?.content?.slice(0, 150) || "";

  return (
    <>
      <Card 
        className={cn(
          "group cursor-pointer transition-all duration-300",
          "hover:border-primary/50 hover:shadow-lg",
          "bg-gradient-to-br from-primary/5 to-primary/10"
        )}
        onClick={() => setIsOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <StickyNote className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Bloco de Notas</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-16 animate-pulse bg-muted rounded" />
          ) : hasContent ? (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {previewText}
              {(note?.content?.length || 0) > 150 && "..."}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Clique para adicionar uma nota rápida...
            </p>
          )}
        </CardContent>
      </Card>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Bloco de Notas</SheetTitle>
          </SheetHeader>
          <NotePanel
            content={note?.content || ""}
            onSave={handleSave}
            isSaving={saveNote.isPending}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
