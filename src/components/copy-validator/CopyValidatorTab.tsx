import { useState } from "react";
import { Loader2, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ValidationResult } from "./types";
import { ValidationResults } from "./ValidationResults";

const MAX_CHARS = 10000;

export function CopyValidatorTab() {
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

  if (result) {
    return (
      <ValidationResults 
        result={result} 
        originalText={texto}
        onReset={handleReset}
        onNewCopy={(newCopy) => {
          setTexto(newCopy);
          setResult(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
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
              className="min-h-[250px] resize-none text-base leading-relaxed"
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
          <div className="mt-4 p-4 rounded-xl bg-muted/50 border">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-accent" />
              Dimensões analisadas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>• Tom e Voz (20%)</div>
              <div>• Emoções Trabalhadas (15%)</div>
              <div>• Estrutura Invisível (20%)</div>
              <div>• Restrições de Linguagem (20%)</div>
              <div>• Prova Social (10%)</div>
              <div>• Urgência (10%)</div>
              <div>• Formato e Legibilidade (5%)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
