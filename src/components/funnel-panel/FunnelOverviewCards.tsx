import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { FunnelData } from "./types";
import { FunnelBudgetOverview } from "./FunnelBudgetOverview";
import { FunnelNextMilestone } from "./FunnelNextMilestone";
import { FunnelKeyDates } from "./FunnelKeyDates";
import { FunnelRevenue } from "./FunnelRevenue";
import { FunnelLinksList } from "./FunnelLinksList";

interface FunnelOverviewCardsProps {
  funnel: FunnelData;
  isLaunchCategory: boolean;
  onUpdate: () => void;
}

interface CardDef {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

function SortableCard({ id, children, isDragging }: { id: string; children: React.ReactNode; isDragging?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group/card",
        isSorting && "opacity-40 scale-[0.98]"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-muted/80 text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hover:bg-muted"
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

const STORAGE_KEY_PREFIX = "funnel_overview_order_";

function getStoredOrder(funnelId: string): string[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + funnelId);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setStoredOrder(funnelId: string, order: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + funnelId, JSON.stringify(order));
  } catch {
    // ignore storage errors
  }
}

export function FunnelOverviewCards({ funnel, isLaunchCategory, onUpdate }: FunnelOverviewCardsProps) {
  const allCards: CardDef[] = useMemo(() => {
    const cards: CardDef[] = [
      {
        id: "budget",
        label: "Verba Total",
        render: () => <FunnelBudgetOverview funnel={funnel} />,
      },
    ];

    if (isLaunchCategory) {
      cards.push(
        {
          id: "milestone",
          label: "Próximo Marco",
          render: () => <FunnelNextMilestone funnel={funnel} />,
        },
        {
          id: "keydates",
          label: "Datas-Chave",
          render: () => <FunnelKeyDates funnel={funnel} onUpdate={onUpdate} />,
        }
      );
    }

    cards.push(
      {
        id: "revenue",
        label: "Faturamento",
        render: () => <FunnelRevenue funnel={funnel} />,
      },
      {
        id: "links",
        label: "Links Úteis",
        render: () => <FunnelLinksList funnelId={funnel.id} />,
      }
    );

    return cards;
  }, [funnel, isLaunchCategory, onUpdate]);

  const defaultOrder = allCards.map((c) => c.id);

  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    const stored = getStoredOrder(funnel.id);
    if (stored) {
      // Filter out any stored IDs that no longer exist and add new ones
      const validStored = stored.filter((id) => defaultOrder.includes(id));
      const missing = defaultOrder.filter((id) => !validStored.includes(id));
      return [...validStored, ...missing];
    }
    return defaultOrder;
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const orderedCards = useMemo(() => {
    return cardOrder
      .map((id) => allCards.find((c) => c.id === id))
      .filter(Boolean) as CardDef[];
  }, [cardOrder, allCards]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setCardOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        setStoredOrder(funnel.id, newOrder);
        return newOrder;
      });
    },
    [funnel.id]
  );

  const activeCard = activeId ? allCards.find((c) => c.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orderedCards.map((card) => (
            <SortableCard key={card.id} id={card.id}>
              {card.render()}
            </SortableCard>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeCard && (
          <div className="opacity-90 shadow-2xl rounded-2xl rotate-2 scale-105 pointer-events-none">
            {activeCard.render()}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
