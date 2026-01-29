import { useState, useCallback } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NotePanel } from "./NotePanel";
import { useUserNote, useSaveNote } from "@/hooks/useUserNotes";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function FloatingNoteButton() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { data: note } = useUserNote();
  const saveNote = useSaveNote();

  const handleSave = useCallback((content: string) => {
    saveNote.mutate(content);
  }, [saveNote]);

  const hasContent = note?.content && note.content.trim().length > 0;

  const buttonElement = (
    <Button
      size="icon"
      className={cn(
        "h-14 w-14 rounded-full shadow-lg",
        "bg-primary hover:bg-primary/90",
        "transition-all duration-200",
        "hover:scale-110 active:scale-95",
        hasContent && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
      )}
    >
      <Pencil className="h-6 w-6" />
    </Button>
  );

  // Mobile: Sheet lateral
  if (isMobile) {
    return (
      <>
        <div className="fixed bottom-20 right-4 z-40">
          <button onClick={() => setIsOpen(true)}>
            {buttonElement}
          </button>
        </div>
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

  // Desktop: Popover
  return (
    <div className="fixed bottom-8 right-8 z-40">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {buttonElement}
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="end" 
          className="w-80 p-4"
          sideOffset={12}
        >
          <NotePanel
            content={note?.content || ""}
            onSave={handleSave}
            isSaving={saveNote.isPending}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
