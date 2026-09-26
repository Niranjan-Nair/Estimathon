import type { QuestionHost } from "./types";

export interface DraftQuestion {
  prompt: string;
  trueAnswer: string;
  unit: string;
  useMagnitude: boolean;
}

export function emptyDraftQuestion(): DraftQuestion {
  return { prompt: "", trueAnswer: "", unit: "", useMagnitude: false };
}

export function draftFromQuestion(q: QuestionHost): DraftQuestion {
  return {
    prompt: q.prompt,
    trueAnswer: String(q.true_answer),
    unit: q.unit ?? "",
    useMagnitude: q.use_magnitude,
  };
}

export interface CleanQuestion {
  prompt: string;
  trueAnswer: number;
  unit: string;
  useMagnitude: boolean;
}

/** Trims and drops incomplete rows (no prompt or non-numeric answer). */
export function cleanDraftQuestions(questions: DraftQuestion[]): CleanQuestion[] {
  return questions
    .map((q) => ({
      prompt: q.prompt.trim(),
      trueAnswer: Number(q.trueAnswer),
      unit: q.unit.trim(),
      useMagnitude: q.useMagnitude,
    }))
    .filter((q) => q.prompt.length > 0 && Number.isFinite(q.trueAnswer));
}

export function toQuestionRows(estimathonId: string, questions: CleanQuestion[]) {
  return questions.map((q, i) => ({
    estimathon_id: estimathonId,
    order_index: i,
    prompt: q.prompt,
    true_answer: q.trueAnswer,
    unit: q.unit || null,
    use_magnitude: q.useMagnitude,
  }));
}
