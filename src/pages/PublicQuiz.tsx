import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Loader2, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useQuizBySlug,
  useCreateSession,
  useSubmitResponse,
  useCompleteSession,
  useSubmitLead,
  QuizQuestion,
  QuizDiagnosis,
} from "@/hooks/useQuizzes";

type Step = "intro" | "questions" | "lead" | "result";

export default function PublicQuiz() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { data: quiz, isLoading, error } = useQuizBySlug(slug);

  const createSession = useCreateSession();
  const submitResponse = useSubmitResponse();
  const completeSession = useCompleteSession();
  const submitLead = useSubmitLead();

  const [step, setStep] = useState<Step>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [leadData, setLeadData] = useState<Record<string, string>>({});
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [collectedTags, setCollectedTags] = useState<string[]>([]);
  const [matchedDiagnosis, setMatchedDiagnosis] = useState<QuizDiagnosis | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  const currentQuestion = quiz?.questions?.[currentQuestionIndex];
  const progress = quiz?.questions?.length
    ? ((currentQuestionIndex) / quiz.questions.length) * 100
    : 0;

  // Start session
  const handleStartQuiz = async () => {
    if (!quiz) return;

    const session = await createSession.mutateAsync({
      quiz_id: quiz.id,
      utm_source: searchParams.get("utm_source") || undefined,
      utm_medium: searchParams.get("utm_medium") || undefined,
      utm_campaign: searchParams.get("utm_campaign") || undefined,
    });

    setSessionId(session.id);
    setStep("questions");
    setQuestionStartTime(Date.now());
  };

  // Submit answer and move to next question
  const handleAnswer = async (answer: any) => {
    if (!sessionId || !currentQuestion) return;

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    // Calculate points and tags for this answer
    let pointsEarned = 0;
    let tagsCollected: string[] = [];

    if (["single_choice", "yes_no"].includes(currentQuestion.question_type)) {
      const selectedOption = currentQuestion.options?.find((o) => o.id === answer);
      if (selectedOption) {
        pointsEarned = selectedOption.points || 0;
        tagsCollected = (selectedOption.tags as string[]) || [];
      }
    } else if (currentQuestion.question_type === "multiple_choice") {
      const selectedIds = answer as string[];
      currentQuestion.options?.forEach((opt) => {
        if (selectedIds.includes(opt.id)) {
          pointsEarned += opt.points || 0;
          tagsCollected.push(...((opt.tags as string[]) || []));
        }
      });
    } else if (currentQuestion.question_type === "scale") {
      pointsEarned = answer as number;
    }

    // Save response
    await submitResponse.mutateAsync({
      session_id: sessionId,
      question_id: currentQuestion.id,
      selected_option_ids: Array.isArray(answer) ? answer : typeof answer === "string" && currentQuestion.question_type !== "text" ? [answer] : [],
      text_response: currentQuestion.question_type === "text" ? answer : undefined,
      number_response: currentQuestion.question_type === "number" ? answer : undefined,
      scale_response: currentQuestion.question_type === "scale" ? answer : undefined,
      points_earned: pointsEarned,
      tags_collected: tagsCollected,
      time_spent_seconds: timeSpent,
    });

    // Update totals
    setTotalScore((prev) => prev + pointsEarned);
    setCollectedTags((prev) => [...prev, ...tagsCollected]);
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));

    // Move to next or finish
    if (currentQuestionIndex < (quiz?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setQuestionStartTime(Date.now());
    } else {
      // All questions answered
      handleQuestionsComplete();
    }
  };

  // Handle quiz completion
  const handleQuestionsComplete = async () => {
    if (!quiz || !sessionId) return;

    // Find matching diagnosis
    const finalScore = totalScore;
    const finalTags = collectedTags;

    let diagnosis: QuizDiagnosis | null = null;

    if (quiz.diagnosis_type === "score") {
      diagnosis = quiz.diagnoses?.find(
        (d) => finalScore >= (d.min_score || 0) && finalScore <= (d.max_score || 999999)
      ) || quiz.diagnoses?.[0] || null;
    } else if (quiz.diagnosis_type === "tags") {
      // Find diagnosis with most matching tags
      let bestMatch = { diagnosis: null as QuizDiagnosis | null, count: 0 };
      quiz.diagnoses?.forEach((d) => {
        const requiredTags = (d.required_tags as string[]) || [];
        const matchCount = requiredTags.filter((t) => finalTags.includes(t)).length;
        if (matchCount > bestMatch.count) {
          bestMatch = { diagnosis: d, count: matchCount };
        }
      });
      diagnosis = bestMatch.diagnosis || quiz.diagnoses?.[0] || null;
    } else {
      diagnosis = quiz.diagnoses?.[0] || null;
    }

    setMatchedDiagnosis(diagnosis);

    // Complete session
    await completeSession.mutateAsync({
      session_id: sessionId,
      quiz_id: quiz.id,
      total_score: finalScore,
      scores_by_axis: { default: finalScore },
      collected_tags: finalTags,
      diagnosis_id: diagnosis?.id,
    });

    // Decide next step based on lead capture settings
    if (quiz.lead_capture_enabled && quiz.lead_capture_position === "before_result") {
      setStep("lead");
    } else {
      setStep("result");
    }
  };

  // Submit lead data
  const handleSubmitLead = async () => {
    if (!sessionId || !quiz) return;

    await submitLead.mutateAsync({
      session_id: sessionId,
      quiz_id: quiz.id,
      name: leadData.name,
      email: leadData.email,
      whatsapp: leadData.whatsapp,
      company: leadData.company,
      city: leadData.city,
      state: leadData.state,
      lgpd_consent: lgpdConsent,
    });

    setStep("result");
  };

  // Handle CTA click
  const handleCTAClick = () => {
    if (quiz?.final_cta_whatsapp) {
      const message = encodeURIComponent(`Olá! Acabei de fazer o diagnóstico "${quiz.title}" e gostaria de saber mais.`);
      window.open(`https://wa.me/${quiz.final_cta_whatsapp}?text=${message}`, "_blank");
    } else if (quiz?.final_cta_url) {
      window.open(quiz.final_cta_url, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Quiz não encontrado</h1>
            <p className="text-muted-foreground">
              Este quiz não existe ou não está mais disponível.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = quiz.primary_color || "#6366f1";
  const bgColor = quiz.background_color || "#ffffff";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: bgColor }}
    >
      {/* Progress Bar */}
      {quiz.show_progress_bar && step === "questions" && (
        <div className="sticky top-0 z-10 p-4" style={{ backgroundColor: bgColor }}>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {currentQuestionIndex + 1} de {quiz.questions?.length}
          </p>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Intro */}
          {step === "intro" && (
            <div className="text-center space-y-6 animate-fade-in">
              {quiz.intro_image_url && (
                <img
                  src={quiz.intro_image_url}
                  alt=""
                  className="w-full max-w-sm mx-auto rounded-xl"
                />
              )}
              <div className="space-y-3">
                <h1 className="text-3xl font-bold">{quiz.intro_title || quiz.title}</h1>
                {quiz.intro_subtitle && (
                  <p className="text-xl text-muted-foreground">{quiz.intro_subtitle}</p>
                )}
                {quiz.intro_text && (
                  <p className="text-muted-foreground">{quiz.intro_text}</p>
                )}
              </div>
              <Button
                size="lg"
                className="w-full max-w-xs text-lg py-6"
                style={{ backgroundColor: primaryColor }}
                onClick={handleStartQuiz}
                disabled={createSession.isPending}
              >
                {createSession.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {quiz.intro_cta_text || "Começar"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              {quiz.privacy_text && (
                <p className="text-xs text-muted-foreground">{quiz.privacy_text}</p>
              )}
            </div>
          )}

          {/* Questions */}
          {step === "questions" && currentQuestion && (
            <QuestionRenderer
              question={currentQuestion}
              primaryColor={primaryColor}
              onAnswer={handleAnswer}
              isSubmitting={submitResponse.isPending}
            />
          )}

          {/* Lead Capture */}
          {step === "lead" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Quase lá!</h2>
                <p className="text-muted-foreground">
                  Preencha seus dados para ver seu diagnóstico
                </p>
              </div>

              <div className="space-y-4">
                {(quiz.lead_fields as string[])?.includes("name") && (
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={leadData.name || ""}
                      onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                      placeholder="Seu nome"
                    />
                  </div>
                )}
                {(quiz.lead_fields as string[])?.includes("email") && (
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={leadData.email || ""}
                      onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                      placeholder="seu@email.com"
                    />
                  </div>
                )}
                {(quiz.lead_fields as string[])?.includes("whatsapp") && (
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input
                      value={leadData.whatsapp || ""}
                      onChange={(e) => setLeadData({ ...leadData, whatsapp: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                )}
                {(quiz.lead_fields as string[])?.includes("company") && (
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input
                      value={leadData.company || ""}
                      onChange={(e) => setLeadData({ ...leadData, company: e.target.value })}
                      placeholder="Nome da empresa"
                    />
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="lgpd"
                    checked={lgpdConsent}
                    onCheckedChange={(checked) => setLgpdConsent(!!checked)}
                  />
                  <label htmlFor="lgpd" className="text-sm text-muted-foreground">
                    {quiz.lgpd_consent_text}
                  </label>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                style={{ backgroundColor: primaryColor }}
                onClick={handleSubmitLead}
                disabled={submitLead.isPending || !lgpdConsent}
              >
                {submitLead.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Ver meu diagnóstico"
                )}
              </Button>
            </div>
          )}

          {/* Result */}
          {step === "result" && matchedDiagnosis && (
            <div className="space-y-6 animate-fade-in">
              <div
                className="text-center p-6 rounded-2xl"
                style={{ backgroundColor: `${matchedDiagnosis.color}15` }}
              >
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: matchedDiagnosis.color }}
                >
                  <Check className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: matchedDiagnosis.color }}>
                  {matchedDiagnosis.title}
                </h2>
              </div>

              {matchedDiagnosis.description && (
                <div className="prose prose-sm max-w-none">
                  <p>{matchedDiagnosis.description}</p>
                </div>
              )}

              {matchedDiagnosis.insights && (matchedDiagnosis.insights as string[]).length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Principais insights:</h3>
                  <ul className="space-y-2">
                    {(matchedDiagnosis.insights as string[]).map((insight, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-1 flex-shrink-0" style={{ color: primaryColor }} />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {matchedDiagnosis.action_plan && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Próximos passos:</h3>
                  <p className="text-sm">{matchedDiagnosis.action_plan}</p>
                </div>
              )}

              {/* Lead capture after result */}
              {quiz.lead_capture_enabled && quiz.lead_capture_position === "after_result" && !sessionId && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Deixe seus dados para receber mais informações
                    </p>
                    {/* Lead form fields would go here */}
                  </CardContent>
                </Card>
              )}

              {/* CTA */}
              {(quiz.final_cta_url || quiz.final_cta_whatsapp) && (
                <Button
                  size="lg"
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                  onClick={handleCTAClick}
                >
                  {quiz.final_cta_whatsapp ? (
                    <MessageCircle className="h-5 w-5 mr-2" />
                  ) : (
                    <ExternalLink className="h-5 w-5 mr-2" />
                  )}
                  {quiz.final_cta_text || "Falar com especialista"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Question Renderer Component
function QuestionRenderer({
  question,
  primaryColor,
  onAnswer,
  isSubmitting,
}: {
  question: QuizQuestion;
  primaryColor: string;
  onAnswer: (answer: any) => void;
  isSubmitting: boolean;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textValue, setTextValue] = useState("");
  const [numberValue, setNumberValue] = useState<number | null>(null);
  const [scaleValue, setScaleValue] = useState<number | null>(null);

  // Reset on question change
  useEffect(() => {
    setSelectedOption(null);
    setSelectedOptions([]);
    setTextValue("");
    setNumberValue(null);
    setScaleValue(null);
  }, [question.id]);

  const handleSubmit = () => {
    switch (question.question_type) {
      case "single_choice":
      case "yes_no":
        if (selectedOption) onAnswer(selectedOption);
        break;
      case "multiple_choice":
        if (selectedOptions.length > 0) onAnswer(selectedOptions);
        break;
      case "text":
        if (textValue.trim()) onAnswer(textValue);
        break;
      case "number":
        if (numberValue !== null) onAnswer(numberValue);
        break;
      case "scale":
        if (scaleValue !== null) onAnswer(scaleValue);
        break;
    }
  };

  const canSubmit = () => {
    if (!question.is_required) return true;
    switch (question.question_type) {
      case "single_choice":
      case "yes_no":
        return !!selectedOption;
      case "multiple_choice":
        return selectedOptions.length > 0;
      case "text":
        return textValue.trim().length > 0;
      case "number":
        return numberValue !== null;
      case "scale":
        return scaleValue !== null;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{question.question_text}</h2>
        {question.helper_text && (
          <p className="text-muted-foreground">{question.helper_text}</p>
        )}
      </div>

      {question.image_url && (
        <img
          src={question.image_url}
          alt=""
          className="w-full rounded-xl"
        />
      )}

      {/* Single Choice / Yes-No */}
      {["single_choice", "yes_no"].includes(question.question_type) && (
        <div className="space-y-3">
          {question.options?.map((option) => (
            <button
              key={option.id}
              className={cn(
                "w-full p-4 text-left rounded-xl border-2 transition-all",
                selectedOption === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              style={selectedOption === option.id ? { borderColor: primaryColor } : {}}
              onClick={() => setSelectedOption(option.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    selectedOption === option.id && "border-primary"
                  )}
                  style={selectedOption === option.id ? { borderColor: primaryColor } : {}}
                >
                  {selectedOption === option.id && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    />
                  )}
                </div>
                <span className="font-medium">{option.option_text}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Multiple Choice */}
      {question.question_type === "multiple_choice" && (
        <div className="space-y-3">
          {question.options?.map((option) => (
            <button
              key={option.id}
              className={cn(
                "w-full p-4 text-left rounded-xl border-2 transition-all",
                selectedOptions.includes(option.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              style={selectedOptions.includes(option.id) ? { borderColor: primaryColor } : {}}
              onClick={() => {
                setSelectedOptions((prev) =>
                  prev.includes(option.id)
                    ? prev.filter((id) => id !== option.id)
                    : [...prev, option.id]
                );
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center",
                    selectedOptions.includes(option.id) && "border-primary"
                  )}
                  style={selectedOptions.includes(option.id) ? { borderColor: primaryColor, backgroundColor: primaryColor } : {}}
                >
                  {selectedOptions.includes(option.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="font-medium">{option.option_text}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Scale */}
      {question.question_type === "scale" && (
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{question.scale_min_label || question.scale_min}</span>
            <span>{question.scale_max_label || question.scale_max}</span>
          </div>
          <div className="flex justify-center gap-2">
            {Array.from(
              { length: (question.scale_max || 5) - (question.scale_min || 1) + 1 },
              (_, i) => (question.scale_min || 1) + i
            ).map((value) => (
              <button
                key={value}
                className={cn(
                  "w-12 h-12 rounded-xl border-2 font-semibold transition-all",
                  scaleValue === value
                    ? "text-white"
                    : "border-border hover:border-primary/50"
                )}
                style={scaleValue === value ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                onClick={() => setScaleValue(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text */}
      {question.question_type === "text" && (
        <Input
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Digite sua resposta..."
          className="text-lg py-6"
        />
      )}

      {/* Number */}
      {question.question_type === "number" && (
        <Input
          type="number"
          value={numberValue ?? ""}
          onChange={(e) => setNumberValue(e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="Digite um número..."
          className="text-lg py-6"
        />
      )}

      <Button
        size="lg"
        className="w-full"
        style={{ backgroundColor: primaryColor }}
        onClick={handleSubmit}
        disabled={!canSubmit() || isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Continuar
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
    </div>
  );
}
