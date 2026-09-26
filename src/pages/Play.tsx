import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { getScoringStrategy } from "../lib/scoring";
import { exponentOf, withUnit } from "../lib/format";
import type { Estimathon, GuessRow, Participant, QuestionPublic } from "../lib/types";
import Leaderboard from "../components/Leaderboard";

export default function Play() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [estimathon, setEstimathon] = useState<Estimathon | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [myGuess, setMyGuess] = useState<GuessRow | null>(null);
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id || !user) return;
    const [{ data: est }, { data: qs }, { data: part }] = await Promise.all([
      supabase.from("estimathons").select("*").eq("id", id).single(),
      supabase
        .from("questions_public")
        .select("*")
        .eq("estimathon_id", id)
        .order("order_index", { ascending: true }),
      supabase
        .from("participants")
        .select("*")
        .eq("estimathon_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    setEstimathon(est as Estimathon);
    setQuestions((qs ?? []) as QuestionPublic[]);
    setParticipant((part as Participant) ?? null);
  }, [id, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`play-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "estimathons", filter: `id=eq.${id}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `estimathon_id=eq.${id}` },
        () => void load(),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [id, load]);

  const currentQuestion = questions.find(
    (q) => q.order_index === estimathon?.current_question_index,
  );

  useEffect(() => {
    if (!currentQuestion || !participant) {
      setMyGuess(null);
      setLow("");
      setHigh("");
      return;
    }
    let mounted = true;
    void supabase
      .from("guesses")
      .select("*")
      .eq("question_id", currentQuestion.id)
      .eq("participant_id", participant.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        const g = (data as GuessRow) ?? null;
        setMyGuess(g);
        if (!g) {
          setLow("");
          setHigh("");
        } else if (currentQuestion.use_magnitude) {
          setLow(String(exponentOf(g.low)));
          setHigh(String(exponentOf(g.high)));
        } else {
          setLow(String(g.low));
          setHigh(String(g.high));
        }
      });
    return () => {
      mounted = false;
    };
  }, [currentQuestion, participant]);

  async function submitGuess(e: React.FormEvent) {
    e.preventDefault();
    if (!currentQuestion || !participant || !estimathon) return;
    setError(null);

    let lowNum: number;
    let highNum: number;
    if (currentQuestion.use_magnitude) {
      const minExponent = Number(low);
      const maxExponent = Number(high);
      if (!Number.isInteger(minExponent) || !Number.isInteger(maxExponent) || maxExponent < minExponent) {
        setError("Enter whole-number powers of 10, with the high exponent ≥ the low exponent.");
        return;
      }
      lowNum = 10 ** minExponent;
      highNum = 10 ** maxExponent;
    } else {
      lowNum = Number(low);
      highNum = Number(high);
      if (!Number.isFinite(lowNum) || !Number.isFinite(highNum) || lowNum <= 0 || highNum < lowNum) {
        setError("Enter a valid range: low > 0 and high ≥ low.");
        return;
      }
    }

    setSubmitting(true);
    const { data, error: err } = await supabase
      .from("guesses")
      .upsert(
        {
          estimathon_id: estimathon.id,
          question_id: currentQuestion.id,
          participant_id: participant.id,
          low: lowNum,
          high: highNum,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "question_id,participant_id" },
      )
      .select("*")
      .single();
    setSubmitting(false);
    if (err) setError(err.message);
    else setMyGuess(data as GuessRow);
  }

  if (!estimathon) return <p className="text-white/50">Loading...</p>;

  if (!participant) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="mb-4 text-white/70">You haven&apos;t joined this estimathon yet.</p>
        <Link to="/join" className="btn-primary">
          Join with a code
        </Link>
      </div>
    );
  }

  const strategy = getScoringStrategy(estimathon.scoring_strategy);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-white">{estimathon.name}</h1>
        <p className="text-sm text-white/50">Playing as {participant.display_name}</p>
      </div>

      {estimathon.status === "draft" && (
        <p className="text-white/60">Waiting for the host to start&hellip;</p>
      )}

      {currentQuestion && (
        <div className="card p-5">
          <p className="font-heading mb-2 text-sm text-white/50">
            Question {currentQuestion.order_index + 1}
          </p>
          <p className="mb-4 text-lg text-white">{currentQuestion.prompt}</p>

          {currentQuestion.revealed ? (
            <div className="space-y-2">
              <div className="rounded-lg bg-base-raised px-4 py-3">
                <span className="text-white/60">True answer: </span>
                <span className="font-heading text-white">
                  {withUnit(currentQuestion.true_answer as number, currentQuestion.unit)}
                </span>
              </div>
              {myGuess && (
                <div className="rounded-lg bg-base-raised px-4 py-3 text-sm text-white/70">
                  Your range:{" "}
                  {currentQuestion.use_magnitude
                    ? `10^${exponentOf(myGuess.low)} – 10^${exponentOf(myGuess.high)}`
                    : withUnit(`${myGuess.low} – ${myGuess.high}`, currentQuestion.unit)}
                  {" · "}
                  {strategy.evaluateGuess(
                    { low: myGuess.low, high: myGuess.high },
                    currentQuestion.true_answer as number,
                    { magnitude: currentQuestion.use_magnitude },
                  ).correct
                    ? "Correct"
                    : "Missed"}
                </div>
              )}
              <p className="text-sm text-white/40">Waiting for the next question&hellip;</p>
            </div>
          ) : (
            <form onSubmit={submitGuess} className="space-y-3">
              {currentQuestion.use_magnitude ? (
                <div className="flex items-center gap-3">
                  <span className="font-heading text-white/50">10^</span>
                  <input
                    className="input-field w-full"
                    placeholder="Low exponent"
                    type="number"
                    step="1"
                    value={low}
                    onChange={(e) => setLow(e.target.value)}
                  />
                  <span className="text-white/40">to</span>
                  <span className="font-heading text-white/50">10^</span>
                  <input
                    className="input-field w-full"
                    placeholder="High exponent"
                    type="number"
                    step="1"
                    value={high}
                    onChange={(e) => setHigh(e.target.value)}
                  />
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    className="input-field w-full"
                    placeholder="Low"
                    type="number"
                    step="any"
                    value={low}
                    onChange={(e) => setLow(e.target.value)}
                  />
                  <input
                    className="input-field w-full"
                    placeholder="High"
                    type="number"
                    step="any"
                    value={high}
                    onChange={(e) => setHigh(e.target.value)}
                  />
                </div>
              )}
              {error && <p className="text-sm text-accent-hover">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {myGuess ? "Update guess" : "Submit guess"}
              </button>
            </form>
          )}
        </div>
      )}

      {estimathon.status === "finished" && (
        <div className="card p-5 text-center">
          <p className="font-heading text-xl text-accent">Estimathon complete</p>
        </div>
      )}

      <Leaderboard estimathonId={estimathon.id} scoringStrategy={estimathon.scoring_strategy} />
    </div>
  );
}
