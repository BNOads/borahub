import { useState, useMemo } from "react";
import { GraduationCap, BookOpen, ClipboardList } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MentoriaProcessosList } from "@/components/mentoria/MentoriaProcessosList";
import { MentoriaKanban } from "@/components/mentoria/MentoriaKanban";
import { MentoriaDocumentos } from "@/components/mentoria/MentoriaDocumentos";
import { CreateProcessoModal } from "@/components/mentoria/CreateProcessoModal";
import { CreateEtapaModal } from "@/components/mentoria/CreateEtapaModal";
import { CreateTarefaModal } from "@/components/mentoria/CreateTarefaModal";
import { ReplicarProcessoModal } from "@/components/mentoria/ReplicarProcessoModal";
import { MentoriaTaskDetailModal } from "@/components/mentoria/MentoriaTaskDetailModal";
import {
  useProcessos,
  useCreateProcesso,
  useUpdateProcesso,
  useDeleteProcesso,
  useCreateEtapa,
  useUpdateEtapa,
  useDeleteEtapa,
  useCreateTarefa,
  useUpdateTarefa,
  useDeleteTarefa,
  useReplicarProcesso,
  useDeleteMentorado,
  ProcessoComEtapas,
  MentoriaEtapa,
  MentoriaTarefa,
} from "@/hooks/useMentoria";

export default function MentoriaView() {
  const { data: processos = [], isLoading } = useProcessos();

  // Selected state
  const [selectedEtapaId, setSelectedEtapaId] = useState<string | null>(null);
  const [selectedProcessoId, setSelectedProcessoId] = useState<string | null>(null);
  const [selectedMentorado, setSelectedMentorado] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("tarefas");

  // Modal states
  const [processoModalOpen, setProcessoModalOpen] = useState(false);
  const [etapaModalOpen, setEtapaModalOpen] = useState(false);
  const [tarefaModalOpen, setTarefaModalOpen] = useState(false);
  const [replicarModalOpen, setReplicarModalOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<MentoriaTarefa | null>(null);

  // Editing states
  const [editingProcesso, setEditingProcesso] = useState<ProcessoComEtapas | null>(null);
  const [editingEtapa, setEditingEtapa] = useState<MentoriaEtapa | null>(null);
  const [editingTarefa, setEditingTarefa] = useState<MentoriaTarefa | null>(null);
  const [processoIdForEtapa, setProcessoIdForEtapa] = useState<string | null>(null);
  const [processoIdForReplicar, setProcessoIdForReplicar] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'processo' | 'etapa' | 'tarefa' | 'mentorado'>('processo');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteMentoradoData, setDeleteMentoradoData] = useState<{ processoId: string; nome: string } | null>(null);

  // Mutations
  const createProcesso = useCreateProcesso();
  const updateProcesso = useUpdateProcesso();
  const deleteProcesso = useDeleteProcesso();
  const createEtapa = useCreateEtapa();
  const updateEtapa = useUpdateEtapa();
  const deleteEtapa = useDeleteEtapa();
  const createTarefa = useCreateTarefa();
  const updateTarefa = useUpdateTarefa();
  const deleteTarefa = useDeleteTarefa();
  const replicarProcesso = useReplicarProcesso();
  const deleteMentorado = useDeleteMentorado();

  // Get selected etapa data
  const selectedEtapa = useMemo(() => {
    if (!selectedEtapaId) return null;
    for (const processo of processos) {
      const etapa = processo.mentoria_etapas.find(e => e.id === selectedEtapaId);
      if (etapa) return etapa;
    }
    return null;
  }, [selectedEtapaId, processos]);

  const selectedProcessoName = useMemo(() => {
    if (!processoIdForReplicar) return "";
    const processo = processos.find(p => p.id === processoIdForReplicar);
    return processo?.name || "";
  }, [processoIdForReplicar, processos]);

  // Handlers
  const handleSelectEtapa = (etapaId: string, processoId: string) => {
    setSelectedEtapaId(etapaId);
    setSelectedProcessoId(processoId);
    setSelectedMentorado(null); // Clear mentorado filter when selecting etapa
  };

  const handleSelectMentorado = (mentoradoNome: string | null, processoId: string) => {
    setSelectedMentorado(mentoradoNome);
    setSelectedProcessoId(processoId);
    // Select the first etapa of this processo if none selected
    if (!selectedEtapaId || selectedProcessoId !== processoId) {
      const processo = processos.find(p => p.id === processoId);
      if (processo && processo.mentoria_etapas.length > 0) {
        setSelectedEtapaId(processo.mentoria_etapas[0].id);
      }
    }
  };

  const handleCreateProcesso = () => {
    setEditingProcesso(null);
    setProcessoModalOpen(true);
  };

  const handleEditProcesso = (processo: ProcessoComEtapas) => {
    setEditingProcesso(processo);
    setProcessoModalOpen(true);
  };

  const handleSubmitProcesso = (data: { name: string; description?: string }) => {
    if (editingProcesso) {
      updateProcesso.mutate({ id: editingProcesso.id, ...data }, {
        onSuccess: () => setProcessoModalOpen(false),
      });
    } else {
      createProcesso.mutate(data, {
        onSuccess: () => setProcessoModalOpen(false),
      });
    }
  };

  const handleDeleteProcesso = (processoId: string) => {
    setDeleteType('processo');
    setDeleteId(processoId);
    setDeleteConfirmOpen(true);
  };

  const handleCreateEtapa = (processoId: string) => {
    setEditingEtapa(null);
    setProcessoIdForEtapa(processoId);
    setEtapaModalOpen(true);
  };

  const handleEditEtapa = (etapa: MentoriaEtapa) => {
    setEditingEtapa(etapa);
    setProcessoIdForEtapa(etapa.processo_id);
    setEtapaModalOpen(true);
  };

  const handleSubmitEtapa = (data: { name: string; processo_id?: string }) => {
    if (editingEtapa) {
      updateEtapa.mutate({ id: editingEtapa.id, name: data.name }, {
        onSuccess: () => setEtapaModalOpen(false),
      });
    } else if (processoIdForEtapa) {
      createEtapa.mutate({ processo_id: processoIdForEtapa, name: data.name }, {
        onSuccess: () => setEtapaModalOpen(false),
      });
    }
  };

  const handleDeleteEtapa = (etapaId: string) => {
    setDeleteType('etapa');
    setDeleteId(etapaId);
    setDeleteConfirmOpen(true);
  };

  const handleCreateTarefa = () => {
    setEditingTarefa(null);
    setTarefaModalOpen(true);
  };

  const handleEditTarefa = (tarefa: MentoriaTarefa) => {
    setEditingTarefa(tarefa);
    setTarefaModalOpen(true);
  };

  const handleSubmitTarefa = (data: { title: string; description?: string; etapa_id?: string }) => {
    if (editingTarefa) {
      updateTarefa.mutate({ 
        id: editingTarefa.id, 
        title: data.title, 
        description: data.description 
      }, {
        onSuccess: () => setTarefaModalOpen(false),
      });
    } else if (selectedEtapaId) {
      createTarefa.mutate({ 
        etapa_id: selectedEtapaId, 
        title: data.title, 
        description: data.description 
      }, {
        onSuccess: () => setTarefaModalOpen(false),
      });
    }
  };

  const handleDeleteTarefa = (tarefaId: string) => {
    setDeleteType('tarefa');
    setDeleteId(tarefaId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteType === 'mentorado' && deleteMentoradoData) {
      deleteMentorado.mutate({ 
        processoId: deleteMentoradoData.processoId, 
        mentoradoNome: deleteMentoradoData.nome 
      }, {
        onSuccess: () => {
          if (selectedMentorado === deleteMentoradoData.nome) {
            setSelectedMentorado(null);
          }
        },
      });
      setDeleteConfirmOpen(false);
      setDeleteMentoradoData(null);
      return;
    }

    if (!deleteId) return;

    switch (deleteType) {
      case 'processo':
        deleteProcesso.mutate(deleteId, {
          onSuccess: () => {
            if (selectedProcessoId === deleteId) {
              setSelectedEtapaId(null);
              setSelectedProcessoId(null);
            }
          },
        });
        break;
      case 'etapa':
        deleteEtapa.mutate(deleteId, {
          onSuccess: () => {
            if (selectedEtapaId === deleteId) {
              setSelectedEtapaId(null);
            }
          },
        });
        break;
      case 'tarefa':
        deleteTarefa.mutate(deleteId);
        break;
    }
    
    setDeleteConfirmOpen(false);
    setDeleteId(null);
  };

  const handleReplicarProcesso = (processoId: string) => {
    setProcessoIdForReplicar(processoId);
    setReplicarModalOpen(true);
  };

  const handleDeleteMentorado = (processoId: string, mentoradoNome: string) => {
    setDeleteType('mentorado');
    setDeleteMentoradoData({ processoId, nome: mentoradoNome });
    setDeleteConfirmOpen(true);
  };

  const handleSubmitReplicar = (mentoradoNome: string) => {
    if (processoIdForReplicar) {
      replicarProcesso.mutate({ processoId: processoIdForReplicar, mentoradoNome }, {
        onSuccess: () => {
          setReplicarModalOpen(false);
          setProcessoIdForReplicar(null);
        },
      });
    }
  };

  const handleToggleComplete = (tarefa: MentoriaTarefa) => {
    const newStatus = tarefa.status === 'completed' ? 'pending' : 'completed';
    updateTarefa.mutate({
      id: tarefa.id,
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  const handleUpdateTarefaStatus = (tarefa: MentoriaTarefa, newStatus: 'pending' | 'in_progress' | 'completed') => {
    updateTarefa.mutate({
      id: tarefa.id,
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  const handleReorderTarefas = (updates: { id: string; position: number }[]) => {
    updates.forEach(({ id, position }) => {
      updateTarefa.mutate({ id, position });
    });
  };

  const handleOpenTaskDetail = (tarefa: MentoriaTarefa) => {
    setSelectedTaskForDetail(tarefa);
    setTaskDetailOpen(true);
  };

  const handleSaveTaskDetail = (tarefa: MentoriaTarefa, updates: { description?: string }) => {
    updateTarefa.mutate({
      id: tarefa.id,
      description: updates.description,
    }, {
      onSuccess: () => {
        setTaskDetailOpen(false);
        setSelectedTaskForDetail(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        <div className="p-2 rounded-lg bg-yellow-500/10">
          <GraduationCap className="h-6 w-6 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Mentoria BORA Acelerar</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie processos de mentoria e acompanhe mentorados
          </p>
        </div>
      </div>

      {/* Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Sidebar */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <MentoriaProcessosList
            processos={processos}
            selectedEtapaId={selectedEtapaId}
            selectedMentorado={selectedMentorado}
            onSelectEtapa={handleSelectEtapa}
            onSelectMentorado={handleSelectMentorado}
            onCreateProcesso={handleCreateProcesso}
            onEditProcesso={handleEditProcesso}
            onDeleteProcesso={handleDeleteProcesso}
            onCreateEtapa={handleCreateEtapa}
            onEditEtapa={handleEditEtapa}
            onDeleteEtapa={handleDeleteEtapa}
            onReplicarProcesso={handleReplicarProcesso}
            onDeleteMentorado={handleDeleteMentorado}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Content */}
        <ResizablePanel defaultSize={75}>
          <div className="h-full p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="w-fit">
                <TabsTrigger value="tarefas" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Tarefas
                </TabsTrigger>
                <TabsTrigger value="documentos" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Documentos Gerais
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tarefas" className="flex-1 mt-4">
                {selectedEtapa ? (
                  <MentoriaKanban
                    tarefas={selectedEtapa.mentoria_tarefas}
                    onUpdateTarefa={handleUpdateTarefaStatus}
                    onToggleComplete={handleToggleComplete}
                    onEditTarefa={handleEditTarefa}
                    onDeleteTarefa={handleDeleteTarefa}
                    onCreateTarefa={handleCreateTarefa}
                    onReplicarProcesso={selectedProcessoId ? () => handleReplicarProcesso(selectedProcessoId) : undefined}
                    onOpenTaskDetail={handleOpenTaskDetail}
                    onReorderTarefas={handleReorderTarefas}
                    etapaName={selectedEtapa.name}
                    filtroMentoradoExterno={selectedMentorado}
                    onClearFiltroMentorado={() => setSelectedMentorado(null)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <GraduationCap className="h-20 w-20 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-medium mb-2">Selecione uma Etapa</h3>
                    <p className="text-muted-foreground max-w-md">
                      Escolha um processo e uma etapa na barra lateral para visualizar e gerenciar as tarefas.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documentos" className="flex-1 mt-4 overflow-hidden">
                <MentoriaDocumentos />
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Modals */}
      <CreateProcessoModal
        open={processoModalOpen}
        onOpenChange={setProcessoModalOpen}
        onSubmit={handleSubmitProcesso}
        editingProcesso={editingProcesso}
        isLoading={createProcesso.isPending || updateProcesso.isPending}
      />

      <CreateEtapaModal
        open={etapaModalOpen}
        onOpenChange={setEtapaModalOpen}
        onSubmit={handleSubmitEtapa}
        editingEtapa={editingEtapa}
        processoId={processoIdForEtapa || undefined}
        isLoading={createEtapa.isPending || updateEtapa.isPending}
      />

      <CreateTarefaModal
        open={tarefaModalOpen}
        onOpenChange={setTarefaModalOpen}
        onSubmit={handleSubmitTarefa}
        editingTarefa={editingTarefa}
        etapaId={selectedEtapaId || undefined}
        isLoading={createTarefa.isPending || updateTarefa.isPending}
      />

      <ReplicarProcessoModal
        open={replicarModalOpen}
        onOpenChange={setReplicarModalOpen}
        onSubmit={handleSubmitReplicar}
        processoName={selectedProcessoName}
        isLoading={replicarProcesso.isPending}
      />

      <MentoriaTaskDetailModal
        tarefa={selectedTaskForDetail}
        open={taskDetailOpen}
        onClose={() => {
          setTaskDetailOpen(false);
          setSelectedTaskForDetail(null);
        }}
        onSave={handleSaveTaskDetail}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'processo' && "Tem certeza que deseja excluir este processo? Todas as etapas e tarefas serão excluídas."}
              {deleteType === 'etapa' && "Tem certeza que deseja excluir esta etapa? Todas as tarefas serão excluídas."}
              {deleteType === 'tarefa' && "Tem certeza que deseja excluir esta tarefa?"}
              {deleteType === 'mentorado' && deleteMentoradoData && `Tem certeza que deseja excluir o mentorado "${deleteMentoradoData.nome}"? Todas as tarefas associadas a este mentorado serão excluídas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
