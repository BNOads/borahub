import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Plus, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMeetings, Meeting } from "@/hooks/useMeetings";

interface MeetingListProps {
  selectedMeetingId: string | null;
  onSelectMeeting: (id: string) => void;
  onCreateMeeting: () => void;
}

export function MeetingList({ selectedMeetingId, onSelectMeeting, onCreateMeeting }: MeetingListProps) {
  const [search, setSearch] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: meetings, isLoading } = useMeetings({
    search: search || undefined,
  });

  const filteredMeetings = meetings?.filter((meeting) => {
    if (!search) return true;
    return meeting.title.toLowerCase().includes(search.toLowerCase());
  });

  const groupedMeetings = filteredMeetings?.reduce((groups, meeting) => {
    const date = new Date(meeting.meeting_date + "T00:00:00");
    const monthKey = format(date, "yyyy-MM");
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(meeting);
    return groups;
  }, {} as Record<string, Meeting[]>);

  const sortedMonths = Object.keys(groupedMeetings || {}).sort().reverse();

  const formatMeetingDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return format(date, "dd/MM", { locale: ptBR });
  };

  const formatMonthHeader = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="w-full md:w-80 border-r bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Reuniões</h2>
          <Button size="sm" onClick={onCreateMeeting}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar reunião..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Meeting List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : filteredMeetings?.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhuma reunião encontrada</p>
            <Button
              variant="link"
              size="sm"
              onClick={onCreateMeeting}
              className="mt-2"
            >
              Criar primeira reunião
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {sortedMonths.map((monthKey) => (
              <div key={monthKey} className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-2">
                  {formatMonthHeader(monthKey)}
                </h3>
                <div className="space-y-1">
                  {groupedMeetings?.[monthKey]?.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={() => onSelectMeeting(meeting.id)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                        selectedMeetingId === meeting.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent"
                      )}
                    >
                      <div className="flex-shrink-0 w-10 text-center">
                        <span className="text-sm font-medium">
                          {formatMeetingDate(meeting.meeting_date)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{meeting.title}</p>
                        {meeting.meeting_time && (
                          <p className="text-xs text-muted-foreground">
                            {meeting.meeting_time.slice(0, 5)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
