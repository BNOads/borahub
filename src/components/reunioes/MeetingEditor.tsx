import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { MeetingWithBlocks, MeetingBlock as MeetingBlockType } from "@/hooks/useMeetings";
import { useUpdateMeeting, useDeleteMeeting } from "@/hooks/useMeetings";
import { useReorderBlocks } from "@/hooks/useMeetingBlocks";
import { MeetingBlock } from "./MeetingBlock";
import { ConvertBlockToTaskModal } from "./ConvertBlockToTaskModal";

interface MeetingEditorProps {
  meeting: MeetingWithBlocks;
  onMeetingDeleted: () => void;
}

export function MeetingEditor({ meeting, onMeetingDeleted }: MeetingEditorProps) {
  const [title, setTitle] = useState(meeting.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date>(new Date(meeting.meeting_date + "T00:00:00"));
  const [blocks, setBlocks] = useState<MeetingBlockType[]>(meeting.meeting_blocks || []);
  const [blockToConvert, setBlockToConvert] = useState<MeetingBlockType | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const reorderBlocks = useReorderBlocks();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setTitle(meeting.title);
    setMeetingDate(new Date(meeting.meeting_date + "T00:00:00"));
    setBlocks(meeting.meeting_blocks || []);
  }, [meeting]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (titleSaveTimeout.current) {
      clearTimeout(titleSaveTimeout.current);
    }
    titleSaveTimeout.current = setTimeout(() => {
      updateMeeting.mutate({ id: meeting.id, title: value });
    }, 1000);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setMeetingDate(date);
      updateMeeting.mutate({
        id: meeting.id,
        meeting_date: format(date, "yyyy-MM-dd"),
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      
      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      setBlocks(newBlocks);

      const updates = newBlocks.map((block, index) => ({
        id: block.id,
        order_index: index,
      }));

      reorderBlocks.mutate({ blocks: updates, meetingId: meeting.id });
    }
  };

  const handleDeleteMeeting = () => {
    if (confirm("Tem certeza que deseja remover esta reunião e todos os seus blocos?")) {
      deleteMeeting.mutate(meeting.id, {
        onSuccess: () => onMeetingDeleted(),
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {isEditingTitle ? (
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                className="text-2xl font-bold h-auto py-1"
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors"
              >
                {title}
              </h1>
            )}

            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(meetingDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={meetingDate}
                    onSelect={handleDateChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteMeeting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Blocks */}
      <div className="flex-1 overflow-y-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {blocks.map((block) => (
                <MeetingBlock
                  key={block.id}
                  block={block}
                  meetingId={meeting.id}
                  onConvertToTask={setBlockToConvert}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

      </div>

      {/* Convert to Task Modal */}
      {blockToConvert && (
        <ConvertBlockToTaskModal
          block={blockToConvert}
          meetingId={meeting.id}
          meetingTitle={meeting.title}
          onClose={() => setBlockToConvert(null)}
        />
      )}
    </div>
  );
}
