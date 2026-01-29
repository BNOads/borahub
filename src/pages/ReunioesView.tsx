import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMeeting } from "@/hooks/useMeetings";
import { MeetingList } from "@/components/reunioes/MeetingList";
import { MeetingEditor } from "@/components/reunioes/MeetingEditor";
import { CreateMeetingModal } from "@/components/reunioes/CreateMeetingModal";

export default function ReunioesView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    searchParams.get("id")
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  const { data: selectedMeeting, isLoading } = useMeeting(selectedMeetingId || undefined);

  // Update URL when meeting is selected
  useEffect(() => {
    if (selectedMeetingId) {
      setSearchParams({ id: selectedMeetingId });
    } else {
      setSearchParams({});
    }
  }, [selectedMeetingId, setSearchParams]);

  // Close sidebar on mobile when meeting is selected
  useEffect(() => {
    if (isMobile && selectedMeetingId) {
      setIsSidebarOpen(false);
    }
  }, [isMobile, selectedMeetingId]);

  const handleSelectMeeting = (id: string) => {
    setSelectedMeetingId(id);
  };

  const handleMeetingCreated = (id: string) => {
    setSelectedMeetingId(id);
  };

  const handleMeetingDeleted = () => {
    setSelectedMeetingId(null);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Sidebar Toggle */}
      {isMobile && (
        <div className="flex items-center justify-between p-2 border-b bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="ml-2">Reuniões</span>
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "transition-all duration-300 flex-shrink-0",
          isMobile
            ? isSidebarOpen
              ? "h-[50vh] border-b"
              : "h-0 overflow-hidden"
            : "h-full"
        )}
      >
        <MeetingList
          selectedMeetingId={selectedMeetingId}
          onSelectMeeting={handleSelectMeeting}
          onCreateMeeting={() => setIsCreateModalOpen(true)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {selectedMeetingId && selectedMeeting ? (
          <MeetingEditor
            meeting={selectedMeeting}
            onMeetingDeleted={handleMeetingDeleted}
          />
        ) : isLoading && selectedMeetingId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhuma reunião selecionada</h2>
            <p className="text-muted-foreground mb-4">
              Selecione uma reunião na lista ou crie uma nova
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Criar Nova Reunião
            </Button>
          </div>
        )}
      </div>

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onMeetingCreated={handleMeetingCreated}
      />
    </div>
  );
}
