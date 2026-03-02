import { useState, useEffect } from "react";
import { Plus, Trash2, ExternalLink, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  useBlingConnection,
  useBlingAuthorizeUrl,
  useBlingOAuthCallback,
  useBookProductAliases,
  useCreateAlias,
  useDeleteAlias,
} from "@/hooks/useBookShipments";

export function BookConfigTab() {
  const { data: connection, isLoading: connLoading } = useBlingConnection();
  const getAuthUrl = useBlingAuthorizeUrl();
  const oauthCallback = useBlingOAuthCallback();
  const { data: aliases = [] } = useBookProductAliases();
  const createAlias = useCreateAlias();
  const deleteAlias = useDeleteAlias();

  const [newAlias, setNewAlias] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [blingAuthUrl, setBlingAuthUrl] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-capture OAuth code from URL redirect
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (code && state === "bling_auth") {
      toast.info("Código OAuth capturado, conectando ao Bling...");
      oauthCallback.mutate(code);
      searchParams.delete("code");
      searchParams.delete("state");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const handleAddAlias = () => {
    if (!newAlias.trim()) return;
    createAlias.mutate(newAlias);
    setNewAlias("");
  };

  const handleConnectBling = async () => {
    try {
      const result = await getAuthUrl.mutateAsync();
      setBlingAuthUrl(result.url);
      const w = window.open(result.url, "_blank", "width=600,height=700");
      if (!w || w.closed) {
        toast.info("Se a janela não abriu, use o link abaixo.");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveAuthCode = () => {
    if (!authCode.trim()) return;
    oauthCallback.mutate(authCode.trim());
    setAuthCode("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Bling Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conexão com Bling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm">Status:</span>
            {connLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : connection?.connected ? (
              <Badge className="bg-green-500 text-white flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Conectado
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Desconectado
              </Badge>
            )}
          </div>

          {!connection?.connected && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Para conectar com o Bling, clique no botão abaixo para abrir a janela de autorização.
                Após autorizar, copie o código de retorno e cole abaixo.
              </p>
              <Button onClick={handleConnectBling} disabled={getAuthUrl.isPending} variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                {getAuthUrl.isPending ? "Carregando..." : "Abrir Autorização Bling"}
              </Button>

              <div className="flex gap-2">
                <Input
                  placeholder="Cole o código de autorização aqui"
                  value={authCode}
                  onChange={e => setAuthCode(e.target.value)}
                />
                <Button onClick={handleSaveAuthCode} disabled={!authCode.trim() || oauthCallback.isPending}>
                  {oauthCallback.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar"}
                </Button>
              </div>

              {blingAuthUrl && (
                <div className="p-3 rounded-md bg-muted border">
                  <p className="text-sm mb-2">Se a janela não abriu, clique no link abaixo:</p>
                  <a href={blingAuthUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
                    {blingAuthUrl}
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product aliases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aliases de Produtos (Livros)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Produtos da Hotmart cujo nome contenha algum destes termos serão identificados como livros físicos.
          </p>

          <div className="flex flex-wrap gap-2">
            {aliases.map(a => (
              <Badge key={a.id} variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
                {a.alias}
                <button onClick={() => deleteAlias.mutate(a.id)} className="ml-1 hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Novo alias (ex: manual, apostila)"
              value={newAlias}
              onChange={e => setNewAlias(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddAlias()}
            />
            <Button onClick={handleAddAlias} disabled={!newAlias.trim() || createAlias.isPending} size="sm">
              <Plus className="h-4 w-4 mr-1" />Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-process */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processamento Automático</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O sistema detecta automaticamente vendas de livros 3x ao dia (08h, 14h e 20h) a partir de 01/03/2025 e cria pedidos no Bling.
            Use o botão abaixo para forçar o processamento agora.
          </p>
          <Button
            onClick={async () => {
              setIsProcessing(true);
              try {
                const { data, error } = await supabase.functions.invoke("bling-sync", {
                  body: { action: "auto_process_book_sales" },
                });
                if (error) throw error;
                toast.success(
                  `Processado! ${data.shipments_created} novos envios, ${data.bling_orders_created} pedidos Bling criados, ${data.skipped} já existentes.`
                );
                if (data.errors?.length > 0) {
                  toast.error(`Erros: ${data.errors.join(", ")}`);
                }
              } catch (err: any) {
                toast.error(err.message);
              } finally {
                setIsProcessing(false);
              }
            }}
            disabled={isProcessing}
            variant="outline"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {isProcessing ? "Processando..." : "Processar Vendas de Livros Agora"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
