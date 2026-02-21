import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichDescriptionEditor } from "@/components/tasks/RichDescriptionEditor";
import { Switch } from "@/components/ui/switch";
import { ListPlus } from "lucide-react";
import { MentoriaTarefa } from "@/hooks/useMentoria";

interface CreateTarefaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; description?: string; etapa_id?: string }) => void;
  onBulkSubmit?: (tasks: { title: string; etapa_id?: string }[]) => void;
  editingTarefa?: MentoriaTarefa | null;
  etapaId?: string;
  isLoading?: boolean;
}

export function CreateTarefaModal({
  open,
  onOpenChange,
  onSubmit,
  onBulkSubmit,
  editingTarefa,
  etapaId,
  isLoading,
}: CreateTarefaModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkTitles, setBulkTitles] = useState("");

  useEffect(() => {
    if (editingTarefa) {
      setTitle(editingTarefa.title);
      setDescription(editingTarefa.description || "");
      setBulkMode(false);
      setBulkTitles("");
    } else {
      setTitle("");
      setDescription("");
      setBulkTitles("");
    }
  }, [editingTarefa, open]);

  const parsedBulkTitles = bulkTitles
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (bulkMode && !editingTarefa) {
      if (parsedBulkTitles.length === 0) return;
      if (onBulkSubmit) {
        onBulkSubmit(parsedBulkTitles.map(t => ({ title: t, etapa_id: etapaId })));
      }
    } else {
      if (!title.trim()) return;
      onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        etapa_id: etapaId,
      });
    }
  };

  const isEditing = !!editingTarefa;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Tarefa" : bulkMode ? "Criar Tarefas em Massa" : "Nova Tarefa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle bulk mode - only when creating */}
          {!isEditing && onBulkSubmit && (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <ListPlus className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="bulk-mode" className="text-sm cursor-pointer">
                  Criar em massa
                </Label>
              </div>
              <Switch
                id="bulk-mode"
                checked={bulkMode}
                onCheckedChange={setBulkMode}
              />
            </div>
          )}

          {bulkMode && !isEditing ? (
            <div className="space-y-2">
              <Label htmlFor="bulk-titles">
                Títulos das tarefas (um por linha) *
              </Label>
              <Textarea
                id="bulk-titles"
                value={bulkTitles}
                onChange={(e) => setBulkTitles(e.target.value)}
                placeholder={"Enviar mensagem de boas-vindas\nPreparar materiais\nAgendar reunião de kickoff\nEnviar formulário de diagnóstico"}
                rows={8}
                className="font-mono text-sm"
              />
              {parsedBulkTitles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {parsedBulkTitles.length} tarefa{parsedBulkTitles.length !== 1 ? "s" : ""} será{parsedBulkTitles.length !== 1 ? "ão" : ""} criada{parsedBulkTitles.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Título da Tarefa *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Enviar mensagem de boas-vindas"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <RichDescriptionEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Detalhes adicionais sobre a tarefa..."
                  rows={3}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                (bulkMode && !isEditing ? parsedBulkTitles.length === 0 : !title.trim())
              }
            >
              {isLoading
                ? "Salvando..."
                : isEditing
                  ? "Salvar"
                  : bulkMode
                    ? `Criar ${parsedBulkTitles.length} tarefa${parsedBulkTitles.length !== 1 ? "s" : ""}`
                    : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
