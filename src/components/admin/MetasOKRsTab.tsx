import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Target, Calendar } from 'lucide-react';
import { useCycles, useObjectives, useAllKeyResultsForCycle, OKRObjective, OKRKeyResult } from '@/hooks/useOKRs';
import { CreateCycleModal } from './CreateCycleModal';
import { CreateObjectiveModal } from './CreateObjectiveModal';
import { ObjectiveDetail } from './ObjectiveDetail';

function CircularProgress({ value, size = 80, strokeWidth = 6, color = '#3b82f6' }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
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
        <span className="text-sm font-bold">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

function ObjectiveCard({ objective, keyResults, onClick }: { objective: OKRObjective; keyResults: OKRKeyResult[]; onClick: () => void }) {
  const progress = keyResults.length > 0
    ? keyResults.reduce((acc, kr) => acc + (kr.target_value > 0 ? (kr.current_value / kr.target_value) * 100 : 0), 0) / keyResults.length
    : 0;

  return (
    <div
      className="bg-card border rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="h-2" style={{ backgroundColor: objective.color }} />
      <div className="p-5 flex flex-col items-center text-center gap-3">
        <CircularProgress value={progress} color={objective.color} />
        <h3 className="font-semibold text-sm leading-tight">{objective.title}</h3>
        <p className="text-xs text-muted-foreground">
          <Target className="inline w-3 h-3 mr-1" />
          {keyResults.length} resultado{keyResults.length !== 1 ? 's' : ''}-chave
        </p>
        <p className="text-xs text-muted-foreground">
          <Calendar className="inline w-3 h-3 mr-1" />
          {new Date(objective.created_at).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
}

export function MetasOKRsTab() {
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<OKRObjective | null>(null);

  const { data: cycles = [] } = useCycles();
  const activeCycleId = selectedCycleId || (cycles.length > 0 ? cycles[0].id : null);
  const { data: objectives = [] } = useObjectives(activeCycleId);
  const { data: allKeyResults = [] } = useAllKeyResultsForCycle(activeCycleId);

  const getKRsForObjective = (objectiveId: string) => allKeyResults.filter(kr => kr.objective_id === objectiveId);
  const activeCycle = cycles.find(c => c.id === activeCycleId);

  if (selectedObjective) {
    return (
      <ObjectiveDetail
        objective={selectedObjective}
        cycle={activeCycle || null}
        onBack={() => setSelectedObjective(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          {cycles.length > 0 && (
            <Select value={activeCycleId || ''} onValueChange={setSelectedCycleId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione um ciclo" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map(cycle => (
                  <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCycleModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Ciclo
          </Button>
          {activeCycleId && (
            <Button onClick={() => setShowObjectiveModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Meta
            </Button>
          )}
        </div>
      </div>

      {/* Period info */}
      {activeCycle && (
        <p className="text-sm text-muted-foreground">
          Período: {new Date(activeCycle.start_date).toLocaleDateString('pt-BR')} — {new Date(activeCycle.end_date).toLocaleDateString('pt-BR')}
        </p>
      )}

      {/* Empty state */}
      {!activeCycleId && (
        <div className="text-center py-16 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhum ciclo criado</p>
          <p className="text-sm">Crie um ciclo de OKRs para começar a definir metas.</p>
        </div>
      )}

      {activeCycleId && objectives.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhuma meta neste ciclo</p>
          <p className="text-sm">Adicione metas e resultados-chave para acompanhar o progresso.</p>
        </div>
      )}

      {/* Objectives grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {objectives.map(obj => (
          <ObjectiveCard
            key={obj.id}
            objective={obj}
            keyResults={getKRsForObjective(obj.id)}
            onClick={() => setSelectedObjective(obj)}
          />
        ))}
      </div>

      <CreateCycleModal open={showCycleModal} onOpenChange={setShowCycleModal} />
      {activeCycleId && (
        <CreateObjectiveModal open={showObjectiveModal} onOpenChange={setShowObjectiveModal} cycleId={activeCycleId} />
      )}
    </div>
  );
}
