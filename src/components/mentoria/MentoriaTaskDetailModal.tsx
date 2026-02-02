import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Save, Link2, Plus, Trash2, ExternalLink, Clock, User, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MentoriaTarefa } from "@/hooks/useMentoria";
import { cn } from "@/lib/utils";

interface TaskLink {
  id: string;
  label: string;
  url: string;
}

interface MentoriaTaskDetailModalProps {
  tarefa: MentoriaTarefa | null;
  open: boolean;
  onClose: () => void;
  onSave: (tarefa: MentoriaTarefa, updates: { description?: string; links?: TaskLink[] }) => void;
}

export function MentoriaTaskDetailModal({
  tarefa,
  open,
  onClose,
  onSave,
}: MentoriaTaskDetailModalProps) {
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (tarefa) {
      setDescription(tarefa.description || "");
      // Parse links from description if stored as JSON, or initialize empty
      try {
        const storedLinks = tarefa.description?.match(/\[LINKS\](.*?)\[\/LINKS\]/s);
        if (storedLinks) {
          setLinks(JSON.parse(storedLinks[1]));
          setDescription(tarefa.description?.replace(/\[LINKS\].*?\[\/LINKS\]/s, "").trim() || "");
        } else {
          setLinks([]);
        }
      } catch {
        setLinks([]);
      }
      setIsEditing(false);
    }
  }, [tarefa]);

  if (!tarefa) return null;

  const handleAddLink = () => {
    if (newLinkLabel && newLinkUrl) {
      const newLink: TaskLink = {
        id: crypto.randomUUID(),
        label: newLinkLabel,
        url: newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`,
      };
      setLinks([...links, newLink]);
      setNewLinkLabel("");
      setNewLinkUrl("");
      setIsEditing(true);
    }
  };

  const handleRemoveLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
    setIsEditing(true);
  };

  const handleSave = () => {
    // Encode links in description
    const linksData = links.length > 0 ? `\n[LINKS]${JSON.stringify(links)}[/LINKS]` : "";
    const fullDescription = description.trim() + linksData;
    
    onSave(tarefa, { description: fullDescription || null as any });
    setIsEditing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">A Fazer</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Em Andamento</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Concluído</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold leading-tight">
                {tarefa.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {getStatusBadge(tarefa.status)}
                {tarefa.mentorado_nome && (
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                    <User className="h-3 w-3 mr-1" />
                    {tarefa.mentorado_nome}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="detalhes" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detalhes">
              <FileText className="h-4 w-4 mr-2" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="links">
              <Link2 className="h-4 w-4 mr-2" />
              Links ({links.length})
            </TabsTrigger>
            <TabsTrigger value="historico">
              <Clock className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="detalhes" className="mt-0 space-y-4">
              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setIsEditing(true);
                  }}
                  placeholder="Adicione uma descrição detalhada para esta tarefa..."
                  className="mt-1.5 min-h-[150px] resize-none"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Criado em:</span>
                  <p className="font-medium">
                    {format(new Date(tarefa.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {tarefa.completed_at && (
                  <div>
                    <span className="text-muted-foreground">Concluído em:</span>
                    <p className="font-medium">
                      {format(new Date(tarefa.completed_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="links" className="mt-0 space-y-4">
              {/* Add new link */}
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <Label className="text-sm font-medium">Adicionar novo link</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do link"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="URL"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleAddLink}
                    disabled={!newLinkLabel || !newLinkUrl}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Links list */}
              {links.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum link adicionado</p>
                  <p className="text-sm">Adicione links importantes para esta tarefa</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{link.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => window.open(link.url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="historico" className="mt-0">
              <div className="space-y-3">
                {/* Timeline */}
                <div className="relative pl-6 border-l-2 border-muted space-y-4">
                  {tarefa.completed_at && (
                    <div className="relative">
                      <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
                      <div className="text-sm">
                        <p className="font-medium">Tarefa concluída</p>
                        <p className="text-muted-foreground">
                          {format(new Date(tarefa.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {tarefa.mentorado_nome && (
                    <div className="relative">
                      <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-amber-500 border-2 border-background" />
                      <div className="text-sm">
                        <p className="font-medium">Replicada para mentorado</p>
                        <p className="text-muted-foreground">
                          Atribuída para: {tarefa.mentorado_nome}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="relative">
                    <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-primary border-2 border-background" />
                    <div className="text-sm">
                      <p className="font-medium">Tarefa criada</p>
                      <p className="text-muted-foreground">
                        {format(new Date(tarefa.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {isEditing && (
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
