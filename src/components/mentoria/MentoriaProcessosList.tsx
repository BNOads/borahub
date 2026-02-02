import { useState } from "react";
import { ChevronDown, ChevronRight, FolderOpen, Plus, Search, MoreHorizontal, Pencil, Trash2, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProcessoComEtapas, MentoriaEtapa } from "@/hooks/useMentoria";
import { cn } from "@/lib/utils";

interface MentoriaProcessosListProps {
  processos: ProcessoComEtapas[];
  selectedEtapaId: string | null;
  onSelectEtapa: (etapaId: string, processoId: string) => void;
  onCreateProcesso: () => void;
  onEditProcesso: (processo: ProcessoComEtapas) => void;
  onDeleteProcesso: (processoId: string) => void;
  onCreateEtapa: (processoId: string) => void;
  onEditEtapa: (etapa: MentoriaEtapa) => void;
  onDeleteEtapa: (etapaId: string) => void;
  onReplicarProcesso: (processoId: string) => void;
}

export function MentoriaProcessosList({
  processos,
  selectedEtapaId,
  onSelectEtapa,
  onCreateProcesso,
  onEditProcesso,
  onDeleteProcesso,
  onCreateEtapa,
  onEditEtapa,
  onDeleteEtapa,
  onReplicarProcesso,
}: MentoriaProcessosListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProcessos, setExpandedProcessos] = useState<Set<string>>(new Set(processos.map(p => p.id)));

  const filteredProcessos = processos.filter(processo =>
    processo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    processo.mentoria_etapas.some(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleProcesso = (processoId: string) => {
    const newExpanded = new Set(expandedProcessos);
    if (newExpanded.has(processoId)) {
      newExpanded.delete(processoId);
    } else {
      newExpanded.add(processoId);
    }
    setExpandedProcessos(newExpanded);
  };

  const getTarefasCount = (etapa: MentoriaEtapa & { mentoria_tarefas: any[] }) => {
    const total = etapa.mentoria_tarefas.length;
    const completed = etapa.mentoria_tarefas.filter(t => t.status === 'completed').length;
    return { total, completed };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Processos</h2>
          <Button size="sm" onClick={onCreateProcesso}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar processo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista de Processos */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredProcessos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum processo encontrado</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredProcessos.map((processo) => (
              <Collapsible
                key={processo.id}
                open={expandedProcessos.has(processo.id)}
                onOpenChange={() => toggleProcesso(processo.id)}
              >
                <div className="flex items-center group">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-start px-2 h-9"
                    >
                      {expandedProcessos.has(processo.id) ? (
                        <ChevronDown className="h-4 w-4 mr-2 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                      )}
                      <span className="truncate font-medium">{processo.name}</span>
                      <Badge variant="secondary" className="ml-auto mr-2">
                        {processo.mentoria_etapas.length}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onReplicarProcesso(processo.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Replicar para Mentorado
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCreateEtapa(processo.id)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Etapa
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditProcesso(processo)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDeleteProcesso(processo.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CollapsibleContent>
                  <div className="ml-4 pl-4 border-l space-y-1 py-1">
                    {processo.mentoria_etapas.map((etapa) => {
                      const { total, completed } = getTarefasCount(etapa);
                      const isSelected = selectedEtapaId === etapa.id;
                      
                      return (
                        <div key={etapa.id} className="flex items-center group">
                          <Button
                            variant={isSelected ? "secondary" : "ghost"}
                            size="sm"
                            className={cn(
                              "flex-1 justify-start px-2 h-8 text-sm",
                              isSelected && "bg-primary/10"
                            )}
                            onClick={() => onSelectEtapa(etapa.id, processo.id)}
                          >
                            <span className="truncate">{etapa.name}</span>
                            <Badge 
                              variant={completed === total && total > 0 ? "default" : "outline"} 
                              className="ml-auto mr-2 text-xs"
                            >
                              {completed}/{total}
                            </Badge>
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditEtapa(etapa)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onDeleteEtapa(etapa.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                    
                    {processo.mentoria_etapas.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">
                        Nenhuma etapa criada
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
