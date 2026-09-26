import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { generateJoinCode } from "../lib/joinCode";
import { DEFAULT_SCORING_STRATEGY, scoringStrategies } from "../lib/scoring";
import { type DraftQuestion, cleanDraftQuestions, emptyDraftQuestion, toQuestionRows } from "../lib/draftQuestion";
import QuestionListEditor from "../components/QuestionListEditor";

export default function CreateEstimathon() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [hostName, setHostName] = useState("");
  const [strategy, setStrategy] = useState(DEFAULT_SCORING_STRATEGY);
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyDraftQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const cleanName = name.trim();
    const cleanHostName = hostName.trim();
    const cleanQuestions = cleanDraftQuestions(questions);

    if (!cleanName) {
      setError("Give your estimathon a name.");
      return;
    }
    if (!cleanHostName) {
      setError("Enter your name as the host.");
      return;
    }
    if (cleanQuestions.length === 0) {
      setError("Add at least one question with a numeric answer.");
      return;
    }

    setSaving(true);
    try {
      const joinCode = generateJoinCode();
      const { data: estimathon, error: estErr } = await supabase
        .from("estimathons")
        .insert({
          name: cleanName,
          host_name: cleanHostName,
          join_code: joinCode,
          host_id: user.id,
          scoring_strategy: strategy,
          status: "draft",
        })
        .select("*")
        .single();

      if (estErr || !estimathon) throw estErr ?? new Error("Failed to create estimathon");

      const rows = toQuestionRows(estimathon.id, cleanQuestions);
      const { error: qErr } = await supabase.from("questions").insert(rows);
      if (qErr) throw qErr;

      navigate(`/host/${estimathon.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading mb-6 text-3xl text-white">Host an Estimathon</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm text-white/70">Estimathon name</label>
          <input
            className="input-field w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friday Estimathon"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-white/70">Your name (host)</label>
          <input
            className="input-field w-full"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="Host name"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-white/70">Scoring</label>
          <select
            className="input-field w-full"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
          >
            {Object.values(scoringStrategies).map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-white/40">
            {scoringStrategies[strategy]?.description}
          </p>
        </div>

        <QuestionListEditor questions={questions} onChange={setQuestions} />

        {error && <p className="text-sm text-accent-hover">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? "Creating..." : "Create Estimathon"}
        </button>
      </form>
    </div>
  );
}
