import { useState } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateReportFolder } from "@/hooks/useReportFolders";

const FOLDER_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#0ea5e9", // sky
];

interface CreateFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFolderModal({ open, onOpenChange }: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(FOLDER_COLORS[0]);

  const createFolder = useCreateReportFolder();

  const handleSubmit = async () => {
    if (!name.trim()) return;

    await createFolder.mutateAsync({ name: name.trim(), color });
    setName("");
    setColor(FOLDER_COLORS[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Nova Pasta
          </DialogTitle>
          <DialogDescription>
            Crie uma pasta para organizar seus relatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nome da Pasta</Label>
            <Input
              id="folder-name"
              placeholder="Ex: Relatórios Mensais"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createFolder.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || createFolder.isPending}>
            {createFolder.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <FolderPlus className="h-4 w-4 mr-1" />
            )}
            Criar Pasta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
