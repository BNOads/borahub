import { Calendar, Clock, Users, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const events = [
  {
    id: 1,
    title: "Daily da equipe",
    time: "09:00",
    duration: "15 min",
    type: "meeting",
    participants: 8,
    isNow: true,
  },
  {
    id: 2,
    title: "Revisão de criativos",
    time: "11:00",
    duration: "1h",
    type: "meeting",
    participants: 4,
  },
  {
    id: 3,
    title: "One-on-one com Maria",
    time: "14:00",
    duration: "30 min",
    type: "one-on-one",
    participants: 2,
  },
  {
    id: 4,
    title: "Planning da semana",
    time: "16:00",
    duration: "1h",
    type: "meeting",
    participants: 12,
  },
];

export function UpcomingEvents() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Eventos de Hoje</h2>
          <Badge variant="outline" className="border-accent text-accent">
            {events.length}
          </Badge>
        </div>
        <button className="text-sm text-accent hover:underline font-medium">
          Ver calendário
        </button>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
              event.isNow
                ? "border-accent bg-accent/5"
                : "border-border hover:border-accent/30"
            }`}
          >
            <div className={`flex flex-col items-center justify-center min-w-[50px] ${
              event.isNow ? "text-accent" : "text-muted-foreground"
            }`}>
              <span className="text-xl font-bold">{event.time}</span>
              <span className="text-xs">{event.duration}</span>
            </div>

            <div className="h-10 w-px bg-border" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{event.title}</h3>
                {event.isNow && (
                  <Badge className="bg-accent text-accent-foreground text-xs animate-pulse-gold">
                    Agora
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {event.participants}
                </span>
                <span className="flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  Google Meet
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
