import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { withUnit } from "../lib/format";
import type { Estimathon, QuestionHost } from "../lib/types";
import Leaderboard from "../components/Leaderboard";

export default function Host() {
  const { id } = useParams<{ id: string }>();
  const [estimathon, setEstimathon] = useState<Estimathon | null>(null);
  const [questions, setQuestions] = useState<QuestionHost[]>([]);
  const [guessCount, setGuessCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: est } = await supabase.from("estimathons").select("*").eq("id", id).single();
    setEstimathon(est as Estimathon);

    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("estimathon_id", id)
      .order("order_index", { ascending: true });
    setQuestions((qs ?? []) as QuestionHost[]);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentQuestion = questions.find(
    (q) => q.order_index === estimathon?.current_question_index,
  );

  useEffect(() => {
    if (!currentQuestion) {
      setGuessCount(0);
      return;
    }
    let mounted = true;

    async function refreshCount() {
      const { count } = await supabase
        .from("guesses")
        .select("id", { count: "exact", head: true })
        .eq("question_id", currentQuestion!.id);
      if (mounted) setGuessCount(count ?? 0);
    }
    void refreshCount();

    const channel = supabase
      .channel(`host-guesses-${currentQuestion.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guesses", filter: `question_id=eq.${currentQuestion.id}` },
        () => void refreshCount(),
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [currentQuestion]);

  async function startEstimathon() {
    if (!estimathon) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("estimathons")
      .update({ status: "active", current_question_index: 0 })
      .eq("id", estimathon.id);
    setBusy(false);
    if (err) setError(err.message);
    else void load();
  }

  async function revealCurrent() {
    if (!currentQuestion) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("questions")
      .update({ revealed: true, revealed_at: new Date().toISOString() })
      .eq("id", currentQuestion.id);
    setBusy(false);
    if (err) setError(err.message);
    else void load();
  }

  async function nextQuestion() {
    if (!estimathon) return;
    const nextIndex = estimathon.current_question_index + 1;
    setBusy(true);
    setError(null);
    const isLast = nextIndex >= questions.length;
    const { error: err } = await supabase
      .from("estimathons")
      .update({
        current_question_index: nextIndex,
        status: isLast ? "finished" : "active",
      })
      .eq("id", estimathon.id);
    setBusy(false);
    if (err) setError(err.message);
    else void load();
  }

  if (!estimathon) return <p className="text-white/50">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-white">{estimathon.name}</h1>
        <div className="card px-4 py-2 text-center">
          <p className="text-xs text-white/50">Join code</p>
          <p className="font-heading text-2xl tracking-widest text-accent">
            {estimathon.join_code}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-accent-hover">{error}</p>}

      {estimathon.status === "draft" && (
        <button className="btn-primary" disabled={busy} onClick={() => void startEstimathon()}>
          Start Estimathon
        </button>
      )}

      {estimathon.status !== "draft" && currentQuestion && (
        <div className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-heading text-sm text-white/50">
              Question {currentQuestion.order_index + 1} of {questions.length}
            </span>
            <span className="text-sm text-white/50">{guessCount} submitted</span>
          </div>
          <p className="mb-4 text-lg text-white">{currentQuestion.prompt}</p>

          {currentQuestion.revealed ? (
            <div className="mb-4 rounded-lg bg-base-raised px-4 py-3">
              <span className="text-white/60">True answer: </span>
              <span className="font-heading text-white">
                {withUnit(currentQuestion.true_answer, currentQuestion.unit)}
              </span>
              {currentQuestion.use_magnitude && (
                <span className="ml-2 text-sm text-white/40">
                  (10^{Math.floor(Math.log10(currentQuestion.true_answer))})
                </span>
              )}
            </div>
          ) : (
            <button className="btn-primary" disabled={busy} onClick={() => void revealCurrent()}>
              Reveal Answer & Score
            </button>
          )}

          {currentQuestion.revealed && estimathon.status !== "finished" && (
            <button className="btn-secondary mt-3" disabled={busy} onClick={() => void nextQuestion()}>
              {estimathon.current_question_index + 1 >= questions.length
                ? "Finish Estimathon"
                : "Next Question"}
            </button>
          )}
        </div>
      )}

      {estimathon.status === "finished" && (
        <div className="card p-5 text-center">
          <p className="font-heading text-xl text-accent">Estimathon complete</p>
        </div>
      )}

      <Leaderboard estimathonId={estimathon.id} scoringStrategy={estimathon.scoring_strategy} />

      <div>
        <h2 className="font-heading mb-2 text-lg text-white/70">All questions</h2>
        <ol className="space-y-1">
          {questions.map((q) => (
            <li
              key={q.id}
              className={
                "card flex items-center justify-between px-3 py-2 text-sm " +
                (q.order_index === estimathon.current_question_index ? "border-accent" : "")
              }
            >
              <span className="text-white/80">
                Q{q.order_index + 1}. {q.prompt}
              </span>
              <span className="text-white/40">
                {q.revealed ? `= ${withUnit(q.true_answer, q.unit)}` : "hidden"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
