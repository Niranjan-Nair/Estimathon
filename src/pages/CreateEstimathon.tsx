import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { generateJoinCode } from "../lib/joinCode";
import { DEFAULT_SCORING_STRATEGY, scoringStrategies } from "../lib/scoring";

interface DraftQuestion {
  prompt: string;
  trueAnswer: string;
  unit: string;
  useMagnitude: boolean;
}

export default function CreateEstimathon() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [hostName, setHostName] = useState("");
  const [strategy, setStrategy] = useState(DEFAULT_SCORING_STRATEGY);
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    { prompt: "", trueAnswer: "", unit: "", useMagnitude: false },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, { prompt: "", trueAnswer: "", unit: "", useMagnitude: false }]);
  }

  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const cleanName = name.trim();
    const cleanHostName = hostName.trim();
    const cleanQuestions = questions
      .map((q) => ({
        prompt: q.prompt.trim(),
        trueAnswer: Number(q.trueAnswer),
        unit: q.unit.trim(),
        useMagnitude: q.useMagnitude,
      }))
      .filter((q) => q.prompt.length > 0 && Number.isFinite(q.trueAnswer));

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

      const rows = cleanQuestions.map((q, i) => ({
        estimathon_id: estimathon.id,
        order_index: i,
        prompt: q.prompt,
        true_answer: q.trueAnswer,
        unit: q.unit || null,
        use_magnitude: q.useMagnitude,
      }));
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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-white/70">Questions</label>
            <button type="button" className="btn-secondary text-sm" onClick={addQuestion}>
              + Add question
            </button>
          </div>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="card flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-xs text-white/40">Q{i + 1}</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-white/40 hover:text-accent"
                      onClick={() => removeQuestion(i)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  className="input-field w-full"
                  placeholder="Prompt (e.g. How many piano tuners are in Chicago?)"
                  value={q.prompt}
                  onChange={(e) => updateQuestion(i, { prompt: e.target.value })}
                  rows={2}
                />
                <div className="flex gap-2">
                  <input
                    className="input-field w-full"
                    placeholder="True answer (numeric)"
                    type="number"
                    step="any"
                    value={q.trueAnswer}
                    onChange={(e) => updateQuestion(i, { trueAnswer: e.target.value })}
                  />
                  <input
                    className="input-field w-28"
                    placeholder="Unit (optional)"
                    value={q.unit}
                    onChange={(e) => updateQuestion(i, { unit: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-white/50">
                  <input
                    type="checkbox"
                    checked={q.useMagnitude}
                    onChange={(e) => updateQuestion(i, { useMagnitude: e.target.checked })}
                  />
                  Order-of-magnitude guessing (players guess a range of powers of 10 instead of
                  exact numbers)
                </label>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-accent-hover">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? "Creating..." : "Create Estimathon"}
        </button>
      </form>
    </div>
  );
}
