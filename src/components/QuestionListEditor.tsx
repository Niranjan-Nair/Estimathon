import { type DraftQuestion, emptyDraftQuestion } from "../lib/draftQuestion";

export default function QuestionListEditor({
  questions,
  onChange,
}: {
  questions: DraftQuestion[];
  onChange: (questions: DraftQuestion[]) => void;
}) {
  function update(index: number, patch: Partial<DraftQuestion>) {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function add() {
    onChange([...questions, emptyDraftQuestion()]);
  }

  function remove(index: number) {
    onChange(questions.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm text-white/70">Questions</label>
        <button type="button" className="btn-secondary text-sm" onClick={add}>
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
                  onClick={() => remove(i)}
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              className="input-field w-full"
              placeholder="Prompt (e.g. How many piano tuners are in Chicago?)"
              value={q.prompt}
              onChange={(e) => update(i, { prompt: e.target.value })}
              rows={2}
            />
            <div className="flex gap-2">
              <input
                className="input-field w-full"
                placeholder="True answer (numeric)"
                type="number"
                step="any"
                value={q.trueAnswer}
                onChange={(e) => update(i, { trueAnswer: e.target.value })}
              />
              <input
                className="input-field w-28"
                placeholder="Unit (optional)"
                value={q.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-white/50">
              <input
                type="checkbox"
                checked={q.useMagnitude}
                onChange={(e) => update(i, { useMagnitude: e.target.checked })}
              />
              Order-of-magnitude guessing (players guess a range of powers of 10 instead of exact
              numbers)
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
