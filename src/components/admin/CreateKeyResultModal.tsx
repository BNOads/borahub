import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateKeyResult } from '@/hooks/useOKRs';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string;
}

export function CreateKeyResultModal({ open, onOpenChange, objectiveId }: Props) {
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const createKR = useCreateKeyResult();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title || !targetValue) return;
    try {
      await createKR.mutateAsync({
        objective_id: objectiveId,
        title,
        target_value: parseFloat(targetValue),
        unit: unit || undefined,
      });
      toast({ title: 'Resultado-chave criado' });
      setTitle(''); setTargetValue(''); setUnit('');
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao criar resultado-chave', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Resultado-Chave</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: 100 vendas do ACE" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Meta (valor)</Label><Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="100" /></div>
            <div><Label>Unidade</Label><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="vendas, R$, %" /></div>
          </div>
          <Button onClick={handleSubmit} disabled={createKR.isPending || !title || !targetValue} className="w-full">
            {createKR.isPending ? 'Criando...' : 'Criar Resultado-Chave'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
