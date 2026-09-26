import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getScoringStrategy } from "../lib/scoring";
import type { QuestionResult } from "../lib/scoring";
import type { GuessRow, LeaderboardEntry, Participant, QuestionPublic } from "../lib/types";

function buildLeaderboard(
  participants: Participant[],
  revealedQuestions: QuestionPublic[],
  guesses: GuessRow[],
  scoringStrategy: string,
): LeaderboardEntry[] {
  const strategy = getScoringStrategy(scoringStrategy);
  const guessesByQuestion = new Map<string, Map<string, GuessRow>>();
  for (const g of guesses) {
    const byParticipant = guessesByQuestion.get(g.question_id) ?? new Map();
    byParticipant.set(g.participant_id, g);
    guessesByQuestion.set(g.question_id, byParticipant);
  }

  const totalRevealed = revealedQuestions.length;

  return participants
    .map((p) => {
      const results: QuestionResult[] = revealedQuestions.map((q) => {
        const guess = guessesByQuestion.get(q.id)?.get(p.id) ?? null;
        return strategy.evaluateGuess(
          guess ? { low: guess.low, high: guess.high } : null,
          q.true_answer as number,
        );
      });
      const total = totalRevealed > 0 ? strategy.aggregate(totalRevealed, results) : 0;
      return {
        participant_id: p.id,
        display_name: p.display_name,
        total,
        correctCount: results.filter((r) => r.correct).length,
        answeredCount: totalRevealed,
      };
    })
    .sort((a, b) => a.total - b.total);
}

export default function Leaderboard({
  estimathonId,
  scoringStrategy,
}: {
  estimathonId: string;
  scoringStrategy: string;
}) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [revealedQuestions, setRevealedQuestions] = useState<QuestionPublic[]>([]);
  const [guesses, setGuesses] = useState<GuessRow[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [{ data: p }, { data: q }, { data: g }] = await Promise.all([
        supabase.from("participants").select("*").eq("estimathon_id", estimathonId),
        supabase
          .from("questions_public")
          .select("*")
          .eq("estimathon_id", estimathonId)
          .eq("revealed", true),
        supabase.from("guesses").select("*").eq("estimathon_id", estimathonId),
      ]);
      if (!mounted) return;
      setParticipants((p ?? []) as Participant[]);
      setRevealedQuestions((q ?? []) as QuestionPublic[]);
      setGuesses((g ?? []) as GuessRow[]);
    }
    void load();

    const channel = supabase
      .channel(`leaderboard-${estimathonId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `estimathon_id=eq.${estimathonId}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guesses", filter: `estimathon_id=eq.${estimathonId}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `estimathon_id=eq.${estimathonId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [estimathonId]);

  const entries = buildLeaderboard(participants, revealedQuestions, guesses, scoringStrategy);

  return (
    <div className="card p-4">
      <h2 className="font-heading mb-3 text-lg text-white">Leaderboard</h2>
      <p className="mb-3 text-xs text-white/50">Lower total score wins.</p>
      {entries.length === 0 ? (
        <p className="text-sm text-white/50">No players yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map((e, i) => (
            <li
              key={e.participant_id}
              className="flex items-center justify-between rounded-lg bg-base-raised px-3 py-2"
            >
              <span className="flex items-center gap-3">
                <span
                  className={"font-heading w-6 text-right " + (i === 0 ? "text-accent" : "text-white/60")}
                >
                  {i + 1}
                </span>
                <span className="text-white">{e.display_name}</span>
              </span>
              <span className="flex items-center gap-3 text-sm text-white/60">
                <span>
                  {e.correctCount}/{e.answeredCount} correct
                </span>
                <span className="font-heading text-white">{e.total.toFixed(1)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
