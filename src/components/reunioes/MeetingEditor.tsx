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
import { Calendar, Trash2, Users, Search, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { MeetingWithBlocks, MeetingBlock as MeetingBlockType } from "@/hooks/useMeetings";
import { useUpdateMeeting, useDeleteMeeting } from "@/hooks/useMeetings";
import { useReorderBlocks } from "@/hooks/useMeetingBlocks";
import { MeetingBlock } from "./MeetingBlock";
import { ConvertBlockToTaskModal } from "./ConvertBlockToTaskModal";
import { supabase } from "@/integrations/supabase/client";

interface MeetingEditorProps {
  meeting: MeetingWithBlocks;
  onMeetingDeleted: () => void;
}

interface TeamMember {
  id: string;
  full_name: string;
}

export function MeetingEditor({ meeting, onMeetingDeleted }: MeetingEditorProps) {
  const [title, setTitle] = useState(meeting.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date>(new Date(meeting.meeting_date + "T00:00:00"));
  const [meetingTime, setMeetingTime] = useState(meeting.meeting_time?.slice(0, 5) || "");
  const [blocks, setBlocks] = useState<MeetingBlockType[]>(meeting.meeting_blocks || []);
  const [blockToConvert, setBlockToConvert] = useState<MeetingBlockType | null>(null);

  // Participants
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(meeting.participants || []);
  const [participantSearch, setParticipantSearch] = useState("");
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);

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

  // Load team members
  useEffect(() => {
    const loadMembers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (data) setTeamMembers(data.filter(m => m.full_name));
    };
    loadMembers();
  }, []);

  useEffect(() => {
    setTitle(meeting.title);
    setMeetingDate(new Date(meeting.meeting_date + "T00:00:00"));
    setMeetingTime(meeting.meeting_time?.slice(0, 5) || "");
    setBlocks(meeting.meeting_blocks || []);
    setSelectedParticipants(meeting.participants || []);
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

  const handleTimeChange = (time: string) => {
    setMeetingTime(time);
    updateMeeting.mutate({
      id: meeting.id,
      meeting_time: time + ":00",
    });
  };

  const toggleParticipant = (name: string) => {
    const newParticipants = selectedParticipants.includes(name)
      ? selectedParticipants.filter(p => p !== name)
      : [...selectedParticipants, name];
    setSelectedParticipants(newParticipants);
    updateMeeting.mutate({
      id: meeting.id,
      participants: newParticipants,
    });
  };

  const filteredMembers = teamMembers.filter(m =>
    m.full_name.toLowerCase().includes(participantSearch.toLowerCase())
  );

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

            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
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

              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <Input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="h-8 w-[100px] text-sm"
                />
              </div>

              <Popover open={showParticipantPicker} onOpenChange={setShowParticipantPicker}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-2">
                    <Users className="h-4 w-4" />
                    {selectedParticipants.length > 0
                      ? `${selectedParticipants.length} participante(s)`
                      : "Adicionar participantes"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        className="h-8 pl-8 text-sm"
                      />
                    </div>
                    <ScrollArea className="h-[180px]">
                      <div className="space-y-0.5">
                        {filteredMembers.map(member => (
                          <label
                            key={member.id}
                            className="flex items-center gap-2 py-1.5 px-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={selectedParticipants.includes(member.full_name)}
                              onCheckedChange={() => toggleParticipant(member.full_name)}
                            />
                            {member.full_name}
                          </label>
                        ))}
                        {filteredMembers.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">Nenhum membro encontrado</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Participant badges */}
            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedParticipants.map(name => (
                  <Badge key={name} variant="secondary" className="gap-1 pr-1 text-xs">
                    {name}
                    <button
                      type="button"
                      onClick={() => toggleParticipant(name)}
                      className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
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
