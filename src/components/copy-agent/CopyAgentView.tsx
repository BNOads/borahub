import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wand2,
  Mail,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Mic,
  Image,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useAuth } from "@/contexts/AuthContext";
import { useActiveFunnels } from "@/hooks/useFunnels";
import { useFunnelProducts, useAllProducts } from "@/hooks/useFunnelProducts";
import { useCreateCopy } from "@/hooks/useCopyBank";
import { supabase } from "@/integrations/supabase/client";

import { CopyScheduleConfig, ScheduleItem } from "./CopyScheduleConfig";
import { GeneratedCopyCard } from "./GeneratedCopyCard";
import { CopyBankList } from "./CopyBankList";

const CHANNELS = [
  { id: "email", label: "E-mail", icon: Mail },
  { id: "whatsapp_grupos", label: "WhatsApp Grupos", icon: MessageSquare },
  { id: "whatsapp_1x1", label: "WhatsApp 1x1", icon: MessageCircle },
  { id: "sms", label: "SMS", icon: Smartphone },
  { id: "audio", label: "Áudios", icon: Mic },
  { id: "conteudo", label: "Conteúdo", icon: Image },
];

const STAGES = [
  { id: "aquecimento", label: "Aquecimento" },
  { id: "captacao", label: "Captação" },
  { id: "cpl_conteudo", label: "CPL/Conteúdo" },
  { id: "evento_aula", label: "Evento/Aula" },
  { id: "abertura_carrinho", label: "Abertura de Carrinho" },
  { id: "carrinho_aberto", label: "Carrinho Aberto" },
  { id: "fechamento", label: "Fechamento" },
  { id: "pos_venda", label: "Pós-venda" },
];

interface GeneratedCopy {
  id: string;
  channel: string;
  content: string;
  suggestedName: string;
  scheduledFor?: string;
  saved: boolean;
}

export function CopyAgentView() {
  const { user, profile } = useAuth();
  const { data: funnels = [] } = useActiveFunnels();
  const createCopy = useCreateCopy();

  // Form state
  const [selectedFunnel, setSelectedFunnel] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [copyType, setCopyType] = useState<"single" | "schedule">("single");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCopies, setGeneratedCopies] = useState<GeneratedCopy[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const selectedFunnelData = funnels.find((f) => f.id === selectedFunnel);
  const { data: funnelProducts = [] } = useFunnelProducts(selectedFunnel);
  const { data: allProducts = [] } = useAllProducts();

  // Get products for dropdown (from funnel or all active)
  const availableProducts = selectedFunnel && funnelProducts.length > 0
    ? funnelProducts.map((fp) => ({ id: fp.product_id, name: fp.product.name }))
    : allProducts.map((p) => ({ id: p.id, name: p.name }));

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((c) => c !== channelId)
        : [...prev, channelId]
    );
  };

  const canGenerate = 
    selectedStage && 
    selectedChannels.length > 0 && 
    (copyType === "single" || schedule.length > 0);

  const generateCopy = async (channel: string, scheduledFor?: string) => {
    const { data, error } = await supabase.functions.invoke("generate-copy", {
      body: {
        funnel_name: selectedFunnelData?.name,
        funnel_category: selectedFunnelData?.category,
        product_name: selectedProduct || selectedFunnelData?.product_name,
        funnel_stage: selectedStage,
        channel,
        additional_context: additionalContext,
        scheduled_for: scheduledFor,
      },
    });

    if (error) throw error;
    return data;
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setGeneratedCopies([]);

    try {
      const copies: GeneratedCopy[] = [];

      if (copyType === "single") {
        // Generate one copy per channel
        for (const channel of selectedChannels) {
          const result = await generateCopy(channel);
          copies.push({
            id: crypto.randomUUID(),
            channel,
            content: result.copy,
            suggestedName: result.suggested_name,
            saved: false,
          });
        }
      } else {
        // Generate copies for schedule
        for (const day of schedule) {
          for (const time of day.times) {
            const scheduledFor = `${format(day.date, "dd/MM", { locale: ptBR })} às ${time}`;
            for (const channel of selectedChannels) {
              const result = await generateCopy(channel, scheduledFor);
              copies.push({
                id: crypto.randomUUID(),
                channel,
                content: result.copy,
                suggestedName: result.suggested_name,
                scheduledFor,
                saved: false,
              });
            }
          }
        }
      }

      setGeneratedCopies(copies);
      toast.success(`${copies.length} copy(ies) gerada(s) com sucesso!`);
    } catch (error) {
      console.error("Error generating copies:", error);
      toast.error("Erro ao gerar copies. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (copyId: string) => {
    const copy = generatedCopies.find((c) => c.id === copyId);
    if (!copy) return;

    setRegeneratingId(copyId);

    try {
      const result = await generateCopy(copy.channel, copy.scheduledFor);
      setGeneratedCopies((prev) =>
        prev.map((c) =>
          c.id === copyId
            ? { ...c, content: result.copy, suggestedName: result.suggested_name, saved: false }
            : c
        )
      );
      toast.success("Copy regenerada!");
    } catch (error) {
      console.error("Error regenerating copy:", error);
      toast.error("Erro ao regenerar copy");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleSave = async (copy: GeneratedCopy) => {
    if (!user || !profile) return;

    createCopy.mutate({
      name: copy.suggestedName,
      author_id: user.id,
      author_name: profile.full_name || profile.email,
      funnel_id: selectedFunnel || null,
      funnel_name: selectedFunnelData?.name || null,
      product_name: selectedProduct || selectedFunnelData?.product_name || null,
      funnel_stage: selectedStage,
      channel: copy.channel,
      content: copy.content,
      scheduled_for: copy.scheduledFor ? new Date(copy.scheduledFor).toISOString() : null,
    }, {
      onSuccess: () => {
        setGeneratedCopies((prev) =>
          prev.map((c) => (c.id === copy.id ? { ...c, saved: true } : c))
        );
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-accent/20 to-primary/20 rounded-2xl">
          <Sparkles className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Agente de Copy</h2>
          <p className="text-sm text-muted-foreground">
            Gere copies originais com a metodologia BORAnaOBRA
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Configuração
            </CardTitle>
            <CardDescription>
              Defina o contexto para a geração das copies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Funnel Selection */}
            <div className="space-y-2">
              <Label>Funil (opcional)</Label>
              <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione um funil..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum funil específico</SelectItem>
                  {funnels.map((funnel) => (
                    <SelectItem key={funnel.id} value={funnel.id}>
                      {funnel.name} {funnel.category && `(${funnel.category})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label>Produto (opcional)</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Produto padrão</SelectItem>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.name}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage Selection */}
            <div className="space-y-2">
              <Label>Etapa do Funil *</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione a etapa..." />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Copy Type */}
            <div className="space-y-3">
              <Label>Tipo de Geração</Label>
              <RadioGroup
                value={copyType}
                onValueChange={(v) => setCopyType(v as "single" | "schedule")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="cursor-pointer">
                    Copy Única
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="schedule" id="schedule" />
                  <Label htmlFor="schedule" className="cursor-pointer">
                    Cronograma
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Schedule Config */}
            {copyType === "schedule" && (
              <CopyScheduleConfig schedule={schedule} onChange={setSchedule} />
            )}

            <Separator />

            {/* Channel Selection */}
            <div className="space-y-3">
              <Label>Canais de Distribuição *</Label>
              <div className="grid grid-cols-2 gap-3">
                {CHANNELS.map((channel) => {
                  const Icon = channel.icon;
                  const isSelected = selectedChannels.includes(channel.id);
                  return (
                    <div
                      key={channel.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50"
                      }`}
                      onClick={() => toggleChannel(channel.id)}
                    >
                      <Checkbox checked={isSelected} />
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{channel.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Additional Context */}
            <div className="space-y-2">
              <Label>Contexto Adicional (opcional)</Label>
              <Textarea
                placeholder="Ex: Foco em urgência, mencionar bônus exclusivo, tom mais descontraído..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                className="rounded-xl min-h-[80px]"
              />
            </div>

            {/* Generate Button */}
            <Button
              className="w-full h-12 gap-2 rounded-xl font-bold"
              variant="gold"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gerando Copies...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Gerar Copies com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Copies */}
        <div className="space-y-6">
          {generatedCopies.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Copies Geradas
              </h3>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {generatedCopies.map((copy) => (
                    <GeneratedCopyCard
                      key={copy.id}
                      channel={copy.channel}
                      content={copy.content}
                      suggestedName={copy.suggestedName}
                      scheduledFor={copy.scheduledFor}
                      onSave={() => handleSave(copy)}
                      onRegenerate={() => handleRegenerate(copy.id)}
                      isRegenerating={regeneratingId === copy.id}
                      isSaved={copy.saved}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {generatedCopies.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted/50 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-semibold mb-2">Nenhuma copy gerada</h4>
                <p className="text-sm text-muted-foreground max-w-[300px]">
                  Configure as opções ao lado e clique em "Gerar Copies com IA" para começar
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Copy Bank */}
      <Separator className="my-8" />
      <CopyBankList />
    </div>
  );
}
