import { toast } from "sonner";
import { Calendar } from "lucide-react";

export default function Agenda() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Agenda</h1>
                    <p className="text-muted-foreground mt-1">Gerencie seus eventos e compromissos</p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center h-[400px] bg-card/30 rounded-[2rem] border border-border">
                <div className="p-4 bg-accent/10 rounded-3xl mb-4">
                    <Calendar className="h-12 w-12 text-accent/50" />
                </div>
                <h3 className="text-lg font-black text-muted-foreground mb-2">Agenda não disponível</h3>
                <p className="text-sm text-muted-foreground/60 text-center max-w-md">
                    A tabela de eventos não está configurada no banco de dados externo. 
                    Configure a tabela "events" para utilizar esta funcionalidade.
                </p>
            </div>
        </div>
    );
}
