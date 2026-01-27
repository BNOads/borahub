import { useState } from "react";
import { FileText, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ValidationResult } from "@/components/copy-validator/types";
import { ValidationResults } from "@/components/copy-validator/ValidationResults";

const MAX_CHARS = 10000;

export default function ValidadorCopy() {
  const [texto, setTexto] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleValidate = async () => {
    if (!texto.trim()) {
      toast.error("Cole ou digite sua copy para validar");
      return;
    }

    if (texto.length > MAX_CHARS) {
      toast.error(`O texto excede o limite de ${MAX_CHARS.toLocaleString()} caracteres`);
      return;
    }

    setIsValidating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("validate-copy", {
        body: { texto },
      });

      if (error) {
        console.error("Validation error:", error);
        toast.error(error.message || "Erro ao validar copy");
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResult(data);
      toast.success("Copy validada com sucesso!");
    } catch (error) {
      console.error("Error validating copy:", error);
      toast.error("Erro ao conectar com o serviço de validação");
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setTexto("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-2xl">
              <FileText className="h-8 w-8 text-accent" />
            </div>
            Validador de Copy
          </h1>
          <p className="text-muted-foreground mt-1">
            Analise sua copy contra as diretrizes da marca BORAnaOBRA
          </p>
        </div>
      </div>

      {/* Main Content */}
      {!result ? (
        <Card className="border-2 border-dashed border-accent/20">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Cole sua copy aqui</label>
                <span className={`text-xs ${texto.length > MAX_CHARS ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {texto.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}
                </span>
              </div>
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Insira o texto de marketing ou vendas que deseja validar contra as diretrizes BORAnaOBRA..."
                className="min-h-[300px] resize-none text-base leading-relaxed"
                disabled={isValidating}
              />
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleValidate}
                disabled={isValidating || !texto.trim()}
                size="lg"
                className="gap-2 px-8"
                variant="gold"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analisando sua copy...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Validar Copy
                  </>
                )}
              </Button>
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 rounded-xl bg-muted/50 border">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Search className="h-4 w-4 text-accent" />
                O que será analisado?
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Tom e Voz:</strong> Direto, maduro, calmo e profissional</li>
                <li>• <strong>Emoções:</strong> Validação de dores reais, foco em alívio</li>
                <li>• <strong>Estrutura Invisível:</strong> Espelhamento, nomeação do problema, quebra de crença</li>
                <li>• <strong>Linguagem:</strong> Frases curtas, parágrafos pequenos, sem jargões</li>
                <li>• <strong>Prova Social:</strong> Humanizada e contextualizada</li>
                <li>• <strong>Urgência:</strong> Baseada em consequência, não desespero</li>
                <li>• <strong>Formato:</strong> Legibilidade e estrutura para mobile</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ValidationResults result={result} onReset={handleReset} />
      )}
    </div>
  );
}
