import { toast } from "sonner";

// Interface local para eventos (tabela não existe no banco externo)
export interface Event {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    event_time: string;
    duration_minutes: number;
    location: string | null;
    meeting_link: string | null;
    event_type: string;
    color: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    event?: Event | null;
    onSuccess: () => void;
    defaultDate?: string;
}

export function EventModal({ isOpen, onClose, event, onSuccess, defaultDate }: EventModalProps) {
    if (!isOpen) return null;
    
    // Modal simplificado - tabela events não existe
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-card p-6 rounded-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Eventos</h2>
                <p className="text-muted-foreground mb-4">
                    A tabela de eventos não está configurada no banco de dados externo.
                </p>
                <button 
                    onClick={onClose}
                    className="w-full py-2 bg-accent text-accent-foreground rounded-xl font-medium"
                >
                    Fechar
                </button>
            </div>
        </div>
    );
}
