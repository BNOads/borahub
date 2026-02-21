import { useState, useMemo, useCallback } from "react";
import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { BoraNewsWidget } from "@/components/bora-news/BoraNewsWidget";
import { ActiveLaunches } from "@/components/dashboard/ActiveLaunches";
import { TodaysTasks } from "@/components/dashboard/TodaysTasks";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { PendingPDIs } from "@/components/dashboard/PendingPDIs";
import { TeamPDIs } from "@/components/dashboard/TeamPDIs";
import { TicketSupportCard } from "@/components/tickets/TicketSupportCard";
import { useAuth } from "@/contexts/AuthContext";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dashboard-card-order";

interface CardConfig {
  id: string;
  component: React.ReactNode;
  span?: "full" | "half";
  adminOnly?: boolean;
}

function SortableCard({ id, children, span, isDragging }: { id: string; children: React.ReactNode; span?: "full" | "half"; isDragging?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
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
        span === "full" ? "col-span-1 xl:col-span-2" : "col-span-1",
        isSortableDragging && "opacity-30"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-background/80 border border-border/50 text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-accent hover:text-foreground cursor-grab active:cursor-grabbing"
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

const Index = () => {
  const { isAdmin, isGuest } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const allCards: CardConfig[] = useMemo(() => [
    { id: "events", component: <UpcomingEvents />, span: "half" },
    { id: "tasks", component: <TodaysTasks />, span: "half" },
    { id: "tickets", component: <TicketSupportCard />, span: "half" },
    { id: "launches", component: <ActiveLaunches />, span: "full" },
    { id: "news", component: <BoraNewsWidget />, span: "half" },
    { id: "pdis", component: <PendingPDIs />, span: "half" },
    { id: "team-pdis", component: <TeamPDIs />, span: "full", adminOnly: true },
  ], []);

  const visibleCards = useMemo(
    () => allCards.filter((c) => !c.adminOnly || isAdmin),
    [allCards, isAdmin]
  );

  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    return visibleCards.map((c) => c.id);
  });

  const orderedCards = useMemo(() => {
    const visibleIds = new Set(visibleCards.map((c) => c.id));
    const ordered: CardConfig[] = [];
    // Add cards in saved order
    for (const id of cardOrder) {
      const card = visibleCards.find((c) => c.id === id);
      if (card) ordered.push(card);
    }
    // Add any new cards not in saved order
    for (const card of visibleCards) {
      if (!cardOrder.includes(card.id)) ordered.push(card);
    }
    return ordered;
  }, [cardOrder, visibleCards]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIds = orderedCards.map((c) => c.id);
    const oldIndex = currentIds.indexOf(active.id as string);
    const newIndex = currentIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(currentIds, oldIndex, newIndex);
    setCardOrder(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
  }, [orderedCards]);

  if (isGuest) {
    return (
      <div className="space-y-8">
        <WelcomeSection />
        <TodaysTasks />
      </div>
    );
  }

  const activeCard = orderedCards.find((c) => c.id === activeId);

  return (
    <div className="space-y-8">
      <WelcomeSection />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedCards.map((c) => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {orderedCards.map((card) => (
              <SortableCard key={card.id} id={card.id} span={card.span}>
                {card.component}
              </SortableCard>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCard ? (
            <div className="opacity-80 rotate-1 scale-[1.02] pointer-events-none">
              {activeCard.component}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Index;
