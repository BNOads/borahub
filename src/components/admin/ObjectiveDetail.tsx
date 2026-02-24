import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, Pencil, Check, Trash2 } from 'lucide-react';
import { OKRObjective, OKRCycle, useKeyResults, useUpdateKeyResult, useDeleteKeyResult, useDeleteObjective } from '@/hooks/useOKRs';
import { CreateKeyResultModal } from './CreateKeyResultModal';
import { useToast } from '@/components/ui/use-toast';

function CircularProgress({ value, size = 120, strokeWidth = 8, color = '#3b82f6' }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/20" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

interface Props {
  objective: OKRObjective;
  cycle: OKRCycle | null;
  onBack: () => void;
}

export function ObjectiveDetail({ objective, cycle, onBack }: Props) {
  const { data: keyResults = [] } = useKeyResults(objective.id);
  const updateKR = useUpdateKeyResult();
  const deleteKR = useDeleteKeyResult();
  const deleteObjective = useDeleteObjective();
  const { toast } = useToast();
  const [showKRModal, setShowKRModal] = useState(false);
  const [editingKRId, setEditingKRId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const progress = keyResults.length > 0
    ? keyResults.reduce((acc, kr) => acc + (kr.target_value > 0 ? (kr.current_value / kr.target_value) * 100 : 0), 0) / keyResults.length
    : 0;

  const handleSaveValue = async (krId: string) => {
    try {
      await updateKR.mutateAsync({ id: krId, current_value: parseFloat(editValue) || 0 });
      setEditingKRId(null);
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const handleDeleteKR = async (krId: string) => {
    try {
      await deleteKR.mutateAsync(krId);
      toast({ title: 'Resultado-chave removido' });
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const handleDeleteObjective = async () => {
    try {
      await deleteObjective.mutateAsync(objective.id);
      toast({ title: 'Meta removida' });
      onBack();
    } catch {
      toast({ title: 'Erro ao remover meta', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Button>

      {/* Header */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <CircularProgress value={progress} color={objective.color} />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{objective.title}</h2>
            {objective.description && <p className="text-muted-foreground mt-1">{objective.description}</p>}
            {cycle && (
              <p className="text-sm text-muted-foreground mt-2">
                {new Date(cycle.start_date).toLocaleDateString('pt-BR')} — {new Date(cycle.end_date).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          <Button variant="destructive" size="sm" onClick={handleDeleteObjective}>
            <Trash2 className="w-4 h-4 mr-1" /> Excluir
          </Button>
        </div>
      </div>

      {/* Key Results */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Resultados-Chave</h3>
        <Button onClick={() => setShowKRModal(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="space-y-3">
        {keyResults.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">Nenhum resultado-chave adicionado.</p>
        )}
        {keyResults.map(kr => {
          const krProgress = kr.target_value > 0 ? (kr.current_value / kr.target_value) * 100 : 0;
          return (
            <div key={kr.id} className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{kr.title}</span>
                <div className="flex items-center gap-2">
                  {editingKRId === kr.id ? (
                    <>
                      <Input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-20 h-7 text-sm"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSaveValue(kr.id)}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveValue(kr.id)}>
                        <Check className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {kr.current_value}/{kr.target_value} {kr.unit || ''}
                      </span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingKRId(kr.id); setEditValue(String(kr.current_value)); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteKR(kr.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <Progress value={Math.min(krProgress, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 text-right">{Math.round(krProgress)}%</p>
            </div>
          );
        })}
      </div>

      <CreateKeyResultModal open={showKRModal} onOpenChange={setShowKRModal} objectiveId={objective.id} />
    </div>
  );
}
