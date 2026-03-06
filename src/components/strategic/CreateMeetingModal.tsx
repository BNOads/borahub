import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useCreateStrategicMeeting } from "@/hooks/useStrategicSession";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

export function CreateMeetingModal({ open, onOpenChange, sessionId }: Props) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [eventTime, setEventTime] = useState("09:00");
  const [duration, setDuration] = useState("30");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const createMeeting = useCreateStrategicMeeting();

  const handleSubmit = async () => {
    if (!title.trim() || !eventDate) return;
    await createMeeting.mutateAsync({
      session_id: sessionId,
      title: title.trim(),
      event_date: eventDate,
      event_time: eventTime || "09:00",
      duration_minutes: parseInt(duration) || 30,
      meeting_link: meetingLink || null,
      notes: notes || null,
    });
    onOpenChange(false);
    setTitle("");
    setEventDate(new Date().toISOString().split("T")[0]);
    setEventTime("09:00");
    setDuration("30");
    setMeetingLink("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Reunião</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Reunião com lead João" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
            </div>
            <div>
              <Label>Horário *</Label>
              <Input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duração (min)</Label>
              <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="5" />
            </div>
            <div>
              <Label>Link da reunião</Label>
              <Input value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações sobre a reunião..." rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={!title.trim() || !eventDate || createMeeting.isPending} className="w-full">
            {createMeeting.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Reunião
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
