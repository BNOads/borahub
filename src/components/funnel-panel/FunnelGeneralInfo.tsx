import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Info,
  Edit,
  X,
  Rocket,
  Tag,
  Package,
  Hash,
  Video,
  Zap,
} from "lucide-react";
import { FunnelData } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FunnelGeneralInfoProps {
  funnel: FunnelData;
  onUpdate: () => void;
}

const CATEGORIES = [
  "E-book",
  "High ticket",
  "Low-ticket",
  "Lançamento",
  "Meteórico",
  "Reabertura",
  "Evento presencial",
];

const LESSON_TYPES = [
  "1 Aula",
  "2 Aulas",
  "3 Aulas",
  "4 Aulas",
  "Webinário",
  "Workshop",
];

const LAUNCH_TYPES = [
  "Semente",
  "Interno",
  "Clássico",
  "Meteórico",
  "Perpétuo",
  "Relançamento",
];

// Cores por categoria
const categoryColors: Record<string, string> = {
  "E-book": "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  "High ticket": "bg-amber-500/10 text-amber-600 border-amber-500/30",
  "Low-ticket": "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  "Lançamento": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  "Meteórico": "bg-purple-500/10 text-purple-600 border-purple-500/30",
  "Reabertura": "bg-pink-500/10 text-pink-600 border-pink-500/30",
  "Evento presencial": "bg-orange-500/10 text-orange-600 border-orange-500/30",
};

interface InfoCardProps {
  label: string;
  value: string | null | undefined;
  icon: React.ReactNode;
  colorClass: string;
  isBadge?: boolean;
  isEmpty?: boolean;
}

function InfoCard({ label, value, icon, colorClass, isBadge, isEmpty }: InfoCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      isEmpty ? "border-dashed border-muted-foreground/30 bg-muted/30" : colorClass
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("p-1.5 rounded-lg", isEmpty ? "bg-muted" : colorClass)}>
          {icon}
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      {isBadge && value ? (
        <Badge variant="outline" className={cn("mt-1 text-sm font-semibold", categoryColors[value] || colorClass)}>
          {value}
        </Badge>
      ) : (
        <p className={cn(
          "text-sm font-semibold truncate",
          isEmpty ? "text-muted-foreground italic" : ""
        )}>
          {value || "Não definido"}
        </p>
      )}
    </div>
  );
}

export function FunnelGeneralInfo({ funnel, onUpdate }: FunnelGeneralInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: funnel.name || "",
    product_name: funnel.product_name || "",
    category: funnel.category || "",
    funnel_type: funnel.funnel_type || "",
    lesson_type: funnel.lesson_type || "",
    launch_type: funnel.launch_type || "",
    code: funnel.code || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("funnels")
        .update(formData)
        .eq("id", funnel.id);

      if (error) throw error;
      toast.success("Informações salvas!");
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: funnel.name || "",
      product_name: funnel.product_name || "",
      category: funnel.category || "",
      funnel_type: funnel.funnel_type || "",
      lesson_type: funnel.lesson_type || "",
      launch_type: funnel.launch_type || "",
      code: funnel.code || "",
    });
    setIsEditing(false);
  };

  // Modo Visualização
  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-accent" />
              Informações Gerais
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Identificação - Azul */}
            <InfoCard
              label="Nome do Funil"
              value={funnel.name}
              icon={<Rocket className="h-4 w-4" />}
              colorClass="bg-blue-500/10 text-blue-600 border-blue-500/20"
              isEmpty={!funnel.name}
            />
            <InfoCard
              label="Código"
              value={funnel.code}
              icon={<Hash className="h-4 w-4" />}
              colorClass="bg-blue-500/10 text-blue-600 border-blue-500/20"
              isEmpty={!funnel.code}
            />
            <InfoCard
              label="Produto"
              value={funnel.product_name}
              icon={<Package className="h-4 w-4" />}
              colorClass="bg-blue-500/10 text-blue-600 border-blue-500/20"
              isEmpty={!funnel.product_name}
            />
            {/* Categoria - Laranja */}
            <InfoCard
              label="Categoria"
              value={funnel.category}
              icon={<Tag className="h-4 w-4" />}
              colorClass="bg-orange-500/10 text-orange-600 border-orange-500/20"
              isBadge
              isEmpty={!funnel.category}
            />
            {/* Configuração - Verde */}
            <InfoCard
              label="Tipo de Aulas"
              value={funnel.lesson_type}
              icon={<Video className="h-4 w-4" />}
              colorClass="bg-green-500/10 text-green-600 border-green-500/20"
              isEmpty={!funnel.lesson_type}
            />
            <InfoCard
              label="Tipo de Lançamento"
              value={funnel.launch_type}
              icon={<Zap className="h-4 w-4" />}
              colorClass="bg-green-500/10 text-green-600 border-green-500/20"
              isEmpty={!funnel.launch_type}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Modo Edição
  return (
    <Card className="border-accent/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Edit className="h-4 w-4 text-accent" />
            Editando Informações
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-blue-600">Nome do Funil</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border-blue-500/30 focus-visible:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-blue-600">Código/Versão</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Ex: V1.0, LNC-001"
              className="border-blue-500/30 focus-visible:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-blue-600">Produto</Label>
            <Input
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="border-blue-500/30 focus-visible:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-orange-600">Categoria</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="border-orange-500/30 focus:ring-orange-500">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-green-600">Tipo de Aulas</Label>
            <Select
              value={formData.lesson_type}
              onValueChange={(value) => setFormData({ ...formData, lesson_type: value })}
            >
              <SelectTrigger className="border-green-500/30 focus:ring-green-500">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {LESSON_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-green-600">Tipo de Lançamento</Label>
            <Select
              value={formData.launch_type}
              onValueChange={(value) => setFormData({ ...formData, launch_type: value })}
            >
              <SelectTrigger className="border-green-500/30 focus:ring-green-500">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {LAUNCH_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
