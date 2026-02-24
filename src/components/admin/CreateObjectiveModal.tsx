import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateObjective } from '@/hooks/useOKRs';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function CreateObjectiveModal({ open, onOpenChange, cycleId }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const createObjective = useCreateObjective();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title) return;
    try {
      await createObjective.mutateAsync({ cycle_id: cycleId, title, description: description || undefined, color });
      toast({ title: 'Meta criada com sucesso' });
      setTitle(''); setDescription(''); setColor('#3b82f6');
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao criar meta', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Meta</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Faturamento de 2mi" /></div>
          <div><Label>Descrição (opcional)</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o objetivo..." /></div>
          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 mt-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: c === color ? 'hsl(var(--foreground))' : 'transparent' }} />
              ))}
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={createObjective.isPending || !title} className="w-full">
            {createObjective.isPending ? 'Criando...' : 'Criar Meta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
