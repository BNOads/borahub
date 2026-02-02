import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";

interface ReplicarProcessoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (mentoradoNome: string) => void;
  processoName?: string;
  isLoading?: boolean;
}

export function ReplicarProcessoModal({
  open,
  onOpenChange,
  onSubmit,
  processoName,
  isLoading,
}: ReplicarProcessoModalProps) {
  const [mentoradoNome, setMentoradoNome] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentoradoNome.trim()) return;
    
    onSubmit(mentoradoNome.trim());
    setMentoradoNome("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Replicar Processo
          </DialogTitle>
          <DialogDescription>
            Criar cópias de todas as tarefas do processo "{processoName}" para um novo mentorado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mentorado">Nome do Mentorado *</Label>
            <Input
              id="mentorado"
              value={mentoradoNome}
              onChange={(e) => setMentoradoNome(e.target.value)}
              placeholder="Ex: João Silva"
              required
            />
            <p className="text-xs text-muted-foreground">
              As tarefas serão criadas com o nome do mentorado para fácil identificação.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!mentoradoNome.trim() || isLoading}>
              {isLoading ? "Replicando..." : "Replicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
