import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, FolderOpen, Plus, Search, MoreHorizontal, Pencil, Trash2, Copy, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProcessoComEtapas, MentoriaEtapa } from "@/hooks/useMentoria";
import { cn } from "@/lib/utils";

interface MentoriaProcessosListProps {
  processos: ProcessoComEtapas[];
  selectedEtapaId: string | null;
  selectedMentorado: string | null;
  onSelectEtapa: (etapaId: string, processoId: string) => void;
  onSelectMentorado: (mentoradoNome: string | null, processoId: string) => void;
  onCreateProcesso: () => void;
  onEditProcesso: (processo: ProcessoComEtapas) => void;
  onDeleteProcesso: (processoId: string) => void;
  onCreateEtapa: (processoId: string) => void;
  onEditEtapa: (etapa: MentoriaEtapa) => void;
  onDeleteEtapa: (etapaId: string) => void;
  onReplicarProcesso: (processoId: string) => void;
  onDeleteMentorado: (processoId: string, mentoradoNome: string) => void;
}

interface MentoradoProgress {
  name: string;
  total: number;
  completed: number;
  percentage: number;
}

export function MentoriaProcessosList({
  processos,
  selectedEtapaId,
  selectedMentorado,
  onSelectEtapa,
  onSelectMentorado,
  onCreateProcesso,
  onEditProcesso,
  onDeleteProcesso,
  onCreateEtapa,
  onEditEtapa,
  onDeleteEtapa,
  onReplicarProcesso,
  onDeleteMentorado,
}: MentoriaProcessosListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProcessos, setExpandedProcessos] = useState<Set<string>>(new Set(processos.map(p => p.id)));
  const [expandedMentorados, setExpandedMentorados] = useState<Set<string>>(new Set());

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

  const toggleMentorado = (key: string) => {
    const newExpanded = new Set(expandedMentorados);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedMentorados(newExpanded);
  };

  const getTarefasCount = (etapa: MentoriaEtapa & { mentoria_tarefas: any[] }, mentoradoNome?: string) => {
    const tarefas = mentoradoNome 
      ? etapa.mentoria_tarefas.filter(t => t.mentorado_nome === mentoradoNome)
      : etapa.mentoria_tarefas.filter(t => !t.mentorado_nome);
    const total = tarefas.length;
    const completed = tarefas.filter(t => t.status === 'completed').length;
    return { total, completed };
  };

  // Get unique mentorados per processo with their progress
  const getMentoradosForProcesso = (processo: ProcessoComEtapas): MentoradoProgress[] => {
    const mentoradoMap = new Map<string, { total: number; completed: number }>();
    
    processo.mentoria_etapas.forEach(etapa => {
      etapa.mentoria_tarefas.forEach(tarefa => {
        if (tarefa.mentorado_nome) {
          const current = mentoradoMap.get(tarefa.mentorado_nome) || { total: 0, completed: 0 };
          current.total += 1;
          if (tarefa.status === 'completed') {
            current.completed += 1;
          }
          mentoradoMap.set(tarefa.mentorado_nome, current);
        }
      });
    });

    return Array.from(mentoradoMap.entries()).map(([name, stats]) => ({
      name,
      total: stats.total,
      completed: stats.completed,
      percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    })).sort((a, b) => a.name.localeCompare(b.name));
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
                        Replicar pra novo processo
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
                    {/* Template Etapas (Processo Padrão) */}
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
                            <DropdownMenuContent align="end" className="bg-popover">
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

                    {/* Mentorados with Progress */}
                    {getMentoradosForProcesso(processo).map((mentorado) => {
                      const mentoradoKey = `${processo.id}-${mentorado.name}`;
                      const isExpanded = expandedMentorados.has(mentoradoKey);
                      const isSelected = selectedMentorado === mentorado.name;
                      
                      return (
                        <div key={mentoradoKey} className="space-y-1">
                          <div className="flex items-center group">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "flex-1 justify-start px-2 h-auto py-2 text-sm border-l-2 border-l-amber-500 cursor-pointer transition-all",
                                isSelected 
                                  ? "bg-amber-500/30 hover:bg-amber-500/40 ring-1 ring-amber-500" 
                                  : "bg-amber-500/10 hover:bg-amber-500/20"
                              )}
                              onClick={() => {
                                // Toggle selection - if already selected, clear it
                                if (isSelected) {
                                  onSelectMentorado(null, processo.id);
                                } else {
                                  onSelectMentorado(mentorado.name, processo.id);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <User className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                <span className={cn(
                                  "truncate font-medium",
                                  isSelected 
                                    ? "text-amber-800 dark:text-amber-300" 
                                    : "text-amber-700 dark:text-amber-400"
                                )}>
                                  {mentorado.name}
                                </span>
                                <div className="ml-auto flex items-center gap-2">
                                  <span className={cn(
                                    "text-xs font-semibold",
                                    isSelected 
                                      ? "text-amber-700 dark:text-amber-300" 
                                      : "text-amber-600 dark:text-amber-400"
                                  )}>
                                    {mentorado.percentage}%
                                  </span>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs",
                                      isSelected 
                                        ? "border-amber-600 text-amber-800 dark:text-amber-300 bg-amber-500/20" 
                                        : "border-amber-500/50 text-amber-700 dark:text-amber-400"
                                    )}
                                  >
                                    {mentorado.completed}/{mentorado.total}
                                  </Badge>
                                </div>
                              </div>
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                <DropdownMenuItem 
                                  onClick={() => onDeleteMentorado(processo.id, mentorado.name)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir Mentorado
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {(isExpanded || isSelected) && (
                            <div className="ml-4 mb-2">
                              <Progress 
                                value={mentorado.percentage} 
                                className="h-1.5 bg-amber-100 dark:bg-amber-900/30"
                              />
                            </div>
                          )}
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
