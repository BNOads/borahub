import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Users, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useCreateMeeting } from "@/hooks/useMeetings";
import { supabase } from "@/integrations/supabase/client";

interface CreateMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMeetingCreated: (id: string) => void;
}

interface TeamMember {
  id: string;
  full_name: string;
}

export function CreateMeetingModal({ open, onOpenChange, onMeetingCreated }: CreateMeetingModalProps) {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date>(new Date());
  const [meetingTime, setMeetingTime] = useState("09:00");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");

  const createMeeting = useCreateMeeting();

  useEffect(() => {
    if (!open) return;
    const loadMembers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (data) setTeamMembers(data.filter(m => m.full_name));
    };
    loadMembers();
  }, [open]);

  const toggleParticipant = (name: string) => {
    setSelectedParticipants(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const filteredMembers = teamMembers.filter(m =>
    m.full_name.toLowerCase().includes(participantSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createMeeting.mutate(
      {
        title: title.trim(),
        meeting_date: format(meetingDate, "yyyy-MM-dd"),
        meeting_time: meetingTime + ":00",
        participants: selectedParticipants,
      },
      {
        onSuccess: (meeting) => {
          onOpenChange(false);
          onMeetingCreated(meeting.id);
          setTitle("");
          setMeetingDate(new Date());
          setMeetingTime("09:00");
          setSelectedParticipants([]);
          setParticipantSearch("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Reunião</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Reunião</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Weekly de Equipe"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !meetingDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {meetingDate ? format(meetingDate, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={meetingDate}
                    onSelect={(date) => date && setMeetingDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_time">Horário</Label>
              <Input
                id="meeting_time"
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
              />
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Participantes
            </Label>
            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedParticipants.map(name => (
                  <Badge key={name} variant="secondary" className="gap-1 pr-1">
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
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar participante..."
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <ScrollArea className="h-[120px] rounded-md border p-2">
              <div className="space-y-1">
                {filteredMembers.map(member => (
                  <label
                    key={member.id}
                    className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted cursor-pointer text-sm"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || createMeeting.isPending}>
              {createMeeting.isPending ? "Criando..." : "Criar Reunião"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
