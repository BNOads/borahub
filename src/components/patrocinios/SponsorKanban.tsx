import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { SponsorCard } from './SponsorCard';
import { Sponsor, SPONSOR_STAGES } from '@/hooks/useSponsors';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SponsorKanbanProps {
  sponsors: Sponsor[];
  isLoading: boolean;
  onMoveSponsor: (sponsorId: string, previousStage: string, newStage: string) => void;
  onAddSponsor: (stage: string) => void;
  onSelectSponsor: (sponsor: Sponsor) => void;
}

interface KanbanColumnProps {
  stage: typeof SPONSOR_STAGES[number];
  sponsors: Sponsor[];
  onAddSponsor: () => void;
  onSelectSponsor: (sponsor: Sponsor) => void;
}

function KanbanColumn({ stage, sponsors, onAddSponsor, onSelectSponsor }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div className="flex flex-col w-[300px] flex-shrink-0">
      {/* Column header */}
      <div className={cn('p-3 rounded-t-lg border border-b-0', stage.color)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {sponsors.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Add button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full rounded-none border-x justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={onAddSponsor}
      >
        <Plus className="h-4 w-4" />
        Adicionar
      </Button>

      {/* Column content */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 border rounded-b-lg p-2 min-h-[200px] transition-colors',
          isOver && 'bg-accent/50 border-primary'
        )}
      >
        <ScrollArea className="h-[calc(100vh-380px)]">
          <SortableContext items={sponsors.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 pr-2">
              {sponsors.map(sponsor => (
                <SponsorCard
                  key={sponsor.id}
                  sponsor={sponsor}
                  onClick={() => onSelectSponsor(sponsor)}
                />
              ))}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>
    </div>
  );
}

export function SponsorKanban({
  sponsors,
  isLoading,
  onMoveSponsor,
  onAddSponsor,
  onSelectSponsor,
}: SponsorKanbanProps) {
  const [activeSponsor, setActiveSponsor] = useState<Sponsor | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const sponsorsByStage = useMemo(() => {
    const result: Record<string, Sponsor[]> = {};
    SPONSOR_STAGES.forEach(stage => {
      result[stage.id] = sponsors.filter(s => s.stage === stage.id);
    });
    return result;
  }, [sponsors]);

  const handleDragStart = (event: DragStartEvent) => {
    const sponsor = sponsors.find(s => s.id === event.active.id);
    if (sponsor) {
      setActiveSponsor(sponsor);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSponsor(null);

    if (!over) return;

    const sponsorId = active.id as string;
    const sponsor = sponsors.find(s => s.id === sponsorId);
    if (!sponsor) return;

    // Check if dropped on a column
    const targetStage = SPONSOR_STAGES.find(s => s.id === over.id);
    if (targetStage && targetStage.id !== sponsor.stage) {
      onMoveSponsor(sponsorId, sponsor.stage, targetStage.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {SPONSOR_STAGES.map(stage => (
          <div key={stage.id} className="w-[300px] flex-shrink-0">
            <Skeleton className="h-12 rounded-t-lg" />
            <Skeleton className="h-10" />
            <div className="space-y-2 p-2 border rounded-b-lg">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {SPONSOR_STAGES.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            sponsors={sponsorsByStage[stage.id] || []}
            onAddSponsor={() => onAddSponsor(stage.id)}
            onSelectSponsor={onSelectSponsor}
          />
        ))}
      </div>

      <DragOverlay>
        {activeSponsor && (
          <Card className="p-3 w-[280px] shadow-xl">
            <h4 className="font-medium text-sm">{activeSponsor.name}</h4>
            <p className="text-xs text-muted-foreground">{activeSponsor.segment}</p>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
