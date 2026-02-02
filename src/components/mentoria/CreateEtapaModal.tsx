import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MentoriaEtapa } from "@/hooks/useMentoria";

interface CreateEtapaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; processo_id?: string }) => void;
  editingEtapa?: MentoriaEtapa | null;
  processoId?: string;
  isLoading?: boolean;
}

export function CreateEtapaModal({
  open,
  onOpenChange,
  onSubmit,
  editingEtapa,
  processoId,
  isLoading,
}: CreateEtapaModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (editingEtapa) {
      setName(editingEtapa.name);
    } else {
      setName("");
    }
  }, [editingEtapa, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSubmit({
      name: name.trim(),
      processo_id: processoId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingEtapa ? "Editar Etapa" : "Nova Etapa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Etapa *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pré-encontro"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? "Salvando..." : editingEtapa ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
