import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCycle } from '@/hooks/useOKRs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCycleModal({ open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const createCycle = useCreateCycle();
  const { profile } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name || !startDate || !endDate) return;
    try {
      await createCycle.mutateAsync({ name, start_date: startDate, end_date: endDate, created_by: profile?.id || '' });
      toast({ title: 'Ciclo criado com sucesso' });
      setName(''); setStartDate(''); setEndDate('');
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao criar ciclo', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Ciclo de OKRs</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: OKRs 2026 - Q1" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Data Início</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div><Label>Data Fim</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          </div>
          <Button onClick={handleSubmit} disabled={createCycle.isPending || !name || !startDate || !endDate} className="w-full">
            {createCycle.isPending ? 'Criando...' : 'Criar Ciclo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
