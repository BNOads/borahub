import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Crosshair, ExternalLink, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useStrategicSessions, useCreateSession } from "@/hooks/useStrategicSession";

export default function SessaoEstrategica() {
  const navigate = useNavigate();
  const { data: sessions = [], isLoading } = useStrategicSessions();
  const createSession = useCreateSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const result = await createSession.mutateAsync({ name, description });
    setOpen(false);
    setName("");
    setDescription("");
    if (result) navigate(`/sessao-estrategica/${result.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crosshair className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Sessões Estratégicas</h1>
            <p className="text-muted-foreground text-sm">Gerencie funis de sessão estratégica</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Sessão</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Sessão Estratégica</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Sessão Estratégica MBA 2026" />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o objetivo da sessão..." />
              </div>
              <Button onClick={handleCreate} disabled={!name.trim() || createSession.isPending} className="w-full">
                {createSession.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Sessão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Crosshair className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhuma sessão ainda</p>
            <p className="text-sm">Crie sua primeira sessão estratégica para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map(session => (
            <Card key={session.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/sessao-estrategica/${session.id}`)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{session.name}</CardTitle>
                  <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                    {session.status === 'active' ? 'Ativa' : 'Finalizada'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {session.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{session.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {session.public_slug && (
                    <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" />Link público</span>
                  )}
                  <span>Criado em {new Date(session.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
