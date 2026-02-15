import { useState, useEffect, useMemo } from "react";
import { Link2, Copy, Download, Trash2, History, Plus, Layers, Check, ChevronDown, ChevronUp, ExternalLink, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Categorias e subcategorias pre-definidas
const UTM_PRESETS: Record<string, string[]> = {
    facebook: ["cpc", "feed", "stories", "reels", "ads_manager"],
    instagram: ["cpc", "feed", "stories", "reels", "explore", "direct"],
    youtube: ["video", "shorts", "banner", "ads", "organic"],
    blog: ["artigo", "sidebar", "banner", "call_to_action"],
    email: ["newsletter", "promocional", "automacao", "followup"],
    pinterest: ["pin", "board", "promoted_pin"],
    aplicativo: ["push_notification", "in_app_banner", "in_app_message"],
    telegram: ["canal", "grupo", "mensagem", "bot"],
    whatsapp: ["message", "grupo", "broadcast", "link_bio"],
    manychat: ["flow", "broadcast", "growth_tool", "default_reply"],
};

interface GeneratedUTM {
    source: string;
    medium: string;
    campaign: string;
    term: string;
    content: string;
    fullUrl: string;
}

interface HistoryItem {
    id: string;
    website_url: string;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_term: string | null;
    utm_content: string | null;
    full_url: string;
    generation_type: string;
    created_at: string;
}

interface DirectLink {
    id: string;
    slug: string;
    target_url: string;
    click_count: number;
    created_at: string;
}

function generateSlug(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < 6; i++) {
        slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
}

export default function UtmCreator() {
    const [activeTab, setActiveTab] = useState("individual");
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [campaign, setCampaign] = useState("");
    const [term, setTerm] = useState("pago");
    const [content, setContent] = useState("");

    // Individual mode
    const [individualSource, setIndividualSource] = useState("");
    const [individualMedium, setIndividualMedium] = useState("");

    // Bulk mode
    const [selectedSources, setSelectedSources] = useState<Record<string, string[]>>({});
    const [expandedSources, setExpandedSources] = useState<string[]>([]);

    // Generated UTMs
    const [generatedUtms, setGeneratedUtms] = useState<GeneratedUTM[]>([]);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [copiedDirect, setCopiedDirect] = useState<string | null>(null);

    // History
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Direct Links
    const [directLinks, setDirectLinks] = useState<DirectLink[]>([]);
    const [creatingDirect, setCreatingDirect] = useState(false);

    useEffect(() => {
        if (showHistory) {
            fetchHistory();
        }
    }, [showHistory]);

    useEffect(() => {
        fetchDirectLinks();
    }, []);

    // Live Preview - builds the UTM URL in real time
    const livePreviewUrl = useMemo(() => {
        if (!websiteUrl) return "";
        try {
            const base = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
            const url = new URL(base);
            
            const source = activeTab === "individual" ? individualSource : "";
            const medium = activeTab === "individual" ? individualMedium : "";
            
            if (source) url.searchParams.set("utm_source", normalizeString(source));
            if (medium) url.searchParams.set("utm_medium", normalizeString(medium));
            if (campaign) url.searchParams.set("utm_campaign", normalizeString(campaign));
            if (term) url.searchParams.set("utm_term", normalizeString(term));
            if (content) url.searchParams.set("utm_content", normalizeString(content));
            
            return url.toString();
        } catch {
            return "";
        }
    }, [websiteUrl, campaign, term, content, individualSource, individualMedium, activeTab]);

    async function fetchDirectLinks() {
        try {
            const { data, error } = await supabase
                .from("direct_links")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            setDirectLinks((data as DirectLink[]) || []);
        } catch (error) {
            console.error("Error fetching direct links:", error);
        }
    }

    async function fetchHistory() {
        try {
            setLoadingHistory(true);
            const { data, error } = await supabase
                .from("utm_history")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoadingHistory(false);
        }
    }

    const normalizeString = (str: string) => {
        return str.toLowerCase().replace(/\s+/g, "_").trim();
    };

    const buildUtmUrl = (source: string, medium: string) => {
        const url = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
        url.searchParams.set("utm_source", normalizeString(source));
        url.searchParams.set("utm_medium", normalizeString(medium));
        url.searchParams.set("utm_campaign", normalizeString(campaign));
        if (term) url.searchParams.set("utm_term", normalizeString(term));
        if (content) url.searchParams.set("utm_content", normalizeString(content));
        return url.toString();
    };

    const generateIndividualUtm = () => {
        if (!websiteUrl || !campaign || !individualSource || !individualMedium) {
            toast.error("Preencha todos os campos obrigatorios");
            return;
        }

        const fullUrl = buildUtmUrl(individualSource, individualMedium);
        const newUtm: GeneratedUTM = {
            source: normalizeString(individualSource),
            medium: normalizeString(individualMedium),
            campaign: normalizeString(campaign),
            term: normalizeString(term),
            content: normalizeString(content),
            fullUrl,
        };

        setGeneratedUtms([newUtm, ...generatedUtms]);
        saveToHistory([newUtm], "individual");
        toast.success("UTM gerada com sucesso!");
    };

    const generateBulkUtms = () => {
        if (!websiteUrl || !campaign) {
            toast.error("Preencha Website URL e Campaign");
            return;
        }

        const selectedCount = Object.values(selectedSources).flat().length;
        if (selectedCount === 0) {
            toast.error("Selecione pelo menos uma subcategoria");
            return;
        }

        const newUtms: GeneratedUTM[] = [];

        Object.entries(selectedSources).forEach(([source, mediums]) => {
            mediums.forEach(medium => {
                const fullUrl = buildUtmUrl(source, medium);
                newUtms.push({
                    source: normalizeString(source),
                    medium: normalizeString(medium),
                    campaign: normalizeString(campaign),
                    term: normalizeString(term),
                    content: normalizeString(content),
                    fullUrl,
                });
            });
        });

        setGeneratedUtms(newUtms);
        saveToHistory(newUtms, "bulk");
        toast.success(`${newUtms.length} UTMs geradas com sucesso!`);
    };

    async function saveToHistory(utms: GeneratedUTM[], type: string) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const batchId = crypto.randomUUID();
            const records = utms.map(utm => ({
                website_url: websiteUrl,
                utm_source: utm.source,
                utm_medium: utm.medium,
                utm_campaign: utm.campaign,
                utm_term: utm.term || null,
                utm_content: utm.content || null,
                full_url: utm.fullUrl,
                generation_type: type,
                batch_id: type === "bulk" ? batchId : null,
                created_by: user.id,
            }));

            await supabase.from("utm_history").insert(records);
        } catch (error) {
            console.error("Error saving to history:", error);
        }
    }

    const createDirectLink = async (targetUrl: string) => {
        if (!targetUrl) {
            toast.error("Gere uma UTM primeiro para criar um Direct Link");
            return;
        }

        try {
            setCreatingDirect(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Voce precisa estar logado");
                return;
            }

            const slug = generateSlug();

            const { error } = await supabase
                .from("direct_links")
                .insert({
                    slug,
                    target_url: targetUrl,
                    created_by: user.id,
                } as any);

            if (error) throw error;

            toast.success("Direct Link criado com sucesso!");
            fetchDirectLinks();
        } catch (error) {
            console.error("Error creating direct link:", error);
            toast.error("Erro ao criar Direct Link");
        } finally {
            setCreatingDirect(false);
        }
    };

    const toggleSource = (source: string) => {
        if (expandedSources.includes(source)) {
            setExpandedSources(expandedSources.filter(s => s !== source));
        } else {
            setExpandedSources([...expandedSources, source]);
        }
    };

    const toggleMedium = (source: string, medium: string) => {
        const currentMediums = selectedSources[source] || [];
        if (currentMediums.includes(medium)) {
            const newMediums = currentMediums.filter(m => m !== medium);
            if (newMediums.length === 0) {
                const { [source]: _, ...rest } = selectedSources;
                setSelectedSources(rest);
            } else {
                setSelectedSources({ ...selectedSources, [source]: newMediums });
            }
        } else {
            setSelectedSources({
                ...selectedSources,
                [source]: [...currentMediums, medium],
            });
        }
    };

    const selectAllMediums = (source: string) => {
        const allMediums = UTM_PRESETS[source];
        const currentMediums = selectedSources[source] || [];
        if (currentMediums.length === allMediums.length) {
            const { [source]: _, ...rest } = selectedSources;
            setSelectedSources(rest);
        } else {
            setSelectedSources({ ...selectedSources, [source]: [...allMediums] });
        }
    };

    const copyToClipboard = async (text: string, index: number) => {
        await navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
        toast.success("URL copiada!");
    };

    const copyDirectLink = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedDirect(id);
        setTimeout(() => setCopiedDirect(null), 2000);
        toast.success("Direct Link copiado!");
    };

    const copyAllUrls = async () => {
        const urls = generatedUtms.map(utm => utm.fullUrl).join("\n");
        await navigator.clipboard.writeText(urls);
        toast.success("Todas as URLs copiadas!");
    };

    const exportCsv = () => {
        const headers = ["Source", "Medium", "Campaign", "Term", "Content", "URL"];
        const rows = generatedUtms.map(utm => [
            utm.source,
            utm.medium,
            utm.campaign,
            utm.term,
            utm.content,
            utm.fullUrl,
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
        downloadFile(csvContent, "utms.csv", "text/csv");
    };

    const exportExcel = () => {
        const headers = ["Source", "Medium", "Campaign", "Term", "Content", "URL"];
        const rows = generatedUtms.map(utm => [
            utm.source,
            utm.medium,
            utm.campaign,
            utm.term,
            utm.content,
            utm.fullUrl,
        ]);

        // Create TSV that Excel can open
        const tsvContent = [headers, ...rows].map(row => row.join("\t")).join("\n");
        downloadFile(tsvContent, "utms.xls", "application/vnd.ms-excel");
    };

    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const clearGenerated = () => {
        setGeneratedUtms([]);
    };

    const selectedCount = Object.values(selectedSources).flat().length;

    const getDirectLinkUrl = (slug: string) => {
        return `${window.location.origin}/d/${slug}`;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Link2 className="h-8 w-8 text-accent" />
                        Criador de UTM
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gere UTMs individuais ou em massa com presets
                    </p>
                </div>
                <Button
                    variant={showHistory ? "default" : "outline"}
                    onClick={() => setShowHistory(!showHistory)}
                    className="rounded-xl gap-2"
                >
                    <History className="h-4 w-4" />
                    Historico
                </Button>
            </div>

            {showHistory ? (
                /* History View */
                <div className="rounded-2xl border bg-card p-6">
                    <h2 className="text-xl font-bold mb-4">Historico de UTMs</h2>
                    {loadingHistory ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-12 bg-accent/5 animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : history.length > 0 ? (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {history.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="p-4 rounded-xl border hover:border-accent/30 transition-all space-y-2"
                                >
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="uppercase text-xs">
                                            {item.utm_source}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                            {item.utm_medium}
                                        </Badge>
                                        <Badge variant="default" className="text-xs bg-accent">
                                            {item.utm_campaign}
                                        </Badge>
                                        {item.utm_term && (
                                            <Badge variant="outline" className="text-xs">
                                                {item.utm_term}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            {new Date(item.created_at).toLocaleDateString("pt-BR")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-muted/50 rounded-lg p-2 overflow-hidden">
                                            <p className="text-xs text-muted-foreground break-all font-mono">
                                                {item.full_url}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg gap-1 flex-shrink-0"
                                            onClick={() => copyToClipboard(item.full_url, index)}
                                        >
                                            {copiedIndex === index ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                            Copiar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">
                            Nenhuma UTM no historico
                        </p>
                    )}
                </div>
            ) : (
                <>
                    {/* Main Form */}
                    <div className="rounded-2xl border bg-card p-6">
                        {/* Common Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <Label>Website URL *</Label>
                                <Input
                                    placeholder="https://seusite.com/pagina"
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    className="rounded-xl"
                                />
                                <p className="text-xs text-muted-foreground">
                                    O link da pagina para onde voce quer enviar as pessoas. Ex: seu site, landing page ou pagina de vendas.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Campaign (Nome da Campanha) *</Label>
                                <Input
                                    placeholder="black-friday-2024"
                                    value={campaign}
                                    onChange={(e) => setCampaign(e.target.value)}
                                    className="rounded-xl"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Um nome para identificar sua campanha ou projeto. Ex: lancamento-curso, black-friday, promocao-maio.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Term (Tipo de Trafego)</Label>
                                <Select value={term} onValueChange={setTerm}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pago">Pago</SelectItem>
                                        <SelectItem value="organico">Organico</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Escolha "Pago" se for anuncio pago (Facebook Ads, Google Ads) ou "Organico" se for conteudo gratuito.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Content (Identificador)</Label>
                                <Input
                                    placeholder="banner-topo"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="rounded-xl"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Opcional. Use para identificar o vendedor ou diferenciar variantes. Ex: joao-silva, equipe-sp, banner-topo.
                                </p>
                            </div>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-2 rounded-xl mb-6">
                                <TabsTrigger value="individual" className="rounded-xl gap-2">
                                    <Plus className="h-4 w-4" />
                                    Individual
                                </TabsTrigger>
                                <TabsTrigger value="bulk" className="rounded-xl gap-2">
                                    <Layers className="h-4 w-4" />
                                    Em Massa
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="individual" className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Source (Plataforma) *</Label>
                                        <Select value={individualSource} onValueChange={(value) => {
                                            setIndividualSource(value);
                                            setIndividualMedium("");
                                        }}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue placeholder="Selecione a plataforma" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(UTM_PRESETS).map(source => (
                                                    <SelectItem key={source} value={source} className="capitalize">
                                                        {source}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            De onde vem o trafego? Escolha a rede social ou canal onde voce vai divulgar.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Medium (Tipo de Postagem) *</Label>
                                        <Select
                                            value={individualMedium}
                                            onValueChange={setIndividualMedium}
                                            disabled={!individualSource}
                                        >
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {individualSource && UTM_PRESETS[individualSource]?.map(medium => (
                                                    <SelectItem key={medium} value={medium}>
                                                        {medium}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Qual formato de conteudo? Ex: stories, feed, reels, email, etc.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={generateIndividualUtm}
                                    className="w-full rounded-xl bg-accent hover:bg-accent/90"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Gerar UTM
                                </Button>
                            </TabsContent>

                            <TabsContent value="bulk" className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Selecione as categorias e subcategorias para gerar todas as combinacoes:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Object.entries(UTM_PRESETS).map(([source, mediums]) => {
                                        const isExpanded = expandedSources.includes(source);
                                        const selectedMediums = selectedSources[source] || [];
                                        const allSelected = selectedMediums.length === mediums.length;

                                        return (
                                            <Collapsible
                                                key={source}
                                                open={isExpanded}
                                                onOpenChange={() => toggleSource(source)}
                                            >
                                                <div className={cn(
                                                    "rounded-xl border p-3 transition-all",
                                                    selectedMediums.length > 0 && "border-accent bg-accent/5"
                                                )}>
                                                    <CollapsibleTrigger asChild>
                                                        <button className="w-full flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium capitalize">{source}</span>
                                                                {selectedMediums.length > 0 && (
                                                                    <Badge className="bg-accent text-accent-foreground text-xs">
                                                                        {selectedMediums.length}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {isExpanded ? (
                                                                <ChevronUp className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="pt-3 space-y-2">
                                                        <button
                                                            onClick={() => selectAllMediums(source)}
                                                            className="text-xs text-accent hover:underline"
                                                        >
                                                            {allSelected ? "Desmarcar todos" : "Selecionar todos"}
                                                        </button>
                                                        <div className="space-y-1">
                                                            {mediums.map(medium => (
                                                                <label
                                                                    key={medium}
                                                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/10 cursor-pointer text-sm"
                                                                >
                                                                    <Checkbox
                                                                        checked={selectedMediums.includes(medium)}
                                                                        onCheckedChange={() => toggleMedium(source, medium)}
                                                                    />
                                                                    {medium}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </CollapsibleContent>
                                                </div>
                                            </Collapsible>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t">
                                    <span className="text-sm text-muted-foreground">
                                        {selectedCount} combinacao(es) selecionada(s)
                                    </span>
                                    <Button
                                        onClick={generateBulkUtms}
                                        disabled={selectedCount === 0}
                                        className="rounded-xl bg-accent hover:bg-accent/90"
                                    >
                                        <Layers className="h-4 w-4 mr-2" />
                                        Gerar {selectedCount} UTM(s)
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Live Preview */}
                    {livePreviewUrl && (
                        <div className="rounded-2xl border bg-card p-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <ExternalLink className="h-5 w-5 text-accent" />
                                    Link UTM (Live Preview)
                                </h2>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-lg gap-2"
                                        onClick={() => {
                                            navigator.clipboard.writeText(livePreviewUrl);
                                            toast.success("Link copiado!");
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                        Copiar
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="rounded-lg gap-2 bg-accent hover:bg-accent/90"
                                        onClick={() => createDirectLink(livePreviewUrl)}
                                        disabled={creatingDirect}
                                    >
                                        <MousePointerClick className="h-4 w-4" />
                                        Criar Redirect
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-muted/50 rounded-xl p-4 overflow-hidden">
                                <p className="text-sm font-mono break-all text-foreground">
                                    {livePreviewUrl}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Generated UTMs */}
                    {generatedUtms.length > 0 && (
                        <div className="rounded-2xl border bg-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold">
                                    UTMs Geradas ({generatedUtms.length})
                                </h2>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={copyAllUrls}
                                        className="rounded-lg gap-2"
                                    >
                                        <Copy className="h-4 w-4" />
                                        Copiar todas
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={exportCsv}
                                        className="rounded-lg gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        CSV
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={exportExcel}
                                        className="rounded-lg gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Excel
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearGenerated}
                                        className="rounded-lg gap-2 text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Limpar
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-xl border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Source</TableHead>
                                            <TableHead>Medium</TableHead>
                                            <TableHead>Campaign</TableHead>
                                            <TableHead>Term</TableHead>
                                            <TableHead>URL Final</TableHead>
                                            <TableHead className="w-[100px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {generatedUtms.map((utm, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Badge variant="outline" className="uppercase">
                                                        {utm.source}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {utm.medium}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {utm.campaign}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={utm.term === "pago" ? "default" : "outline"}>
                                                        {utm.term}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[300px]">
                                                    <span className="text-xs text-muted-foreground truncate block">
                                                        {utm.fullUrl}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => copyToClipboard(utm.fullUrl, index)}
                                                        >
                                                            {copiedIndex === index ? (
                                                                <Check className="h-4 w-4 text-green-500" />
                                                            ) : (
                                                                <Copy className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            title="Criar Redirect"
                                                            onClick={() => createDirectLink(utm.fullUrl)}
                                                            disabled={creatingDirect}
                                                        >
                                                            <MousePointerClick className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {/* Direct Links */}
                    {directLinks.length > 0 && (
                        <div className="rounded-2xl border bg-card p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <MousePointerClick className="h-5 w-5 text-accent" />
                                Meus Redirect Links ({directLinks.length})
                            </h2>
                            <div className="space-y-3">
                                {directLinks.map((link) => (
                                    <div
                                        key={link.id}
                                        className="p-4 rounded-xl border hover:border-accent/30 transition-all space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    /d/{link.slug}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {link.click_count} clique(s)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(link.created_at).toLocaleDateString("pt-BR")}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-lg gap-1"
                                                    onClick={() => copyDirectLink(getDirectLinkUrl(link.slug), link.id)}
                                                >
                                                    {copiedDirect === link.id ? (
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                    Copiar
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-sm font-mono text-accent break-all">
                                                {getDirectLinkUrl(link.slug)}
                                            </p>
                                            <p className="text-xs text-muted-foreground break-all">
                                                → {link.target_url}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
