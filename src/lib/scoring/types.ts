export interface Guess {
  low: number;
  high: number;
}

/** Per-question outcome for one participant, feeding into aggregate(). */
export interface QuestionResult {
  correct: boolean;
  /** Only meaningful when correct: how tight the range was (bigger = worse). */
  ratio: number;
}

/**
 * A scoring strategy evaluates each guess against the true answer, then
 * aggregates a participant's results across every revealed question into
 * one leaderboard score. Every strategy here is golf-style: lower is
 * better. To add a strategy, implement this interface and register it in
 * ./index.ts -- nothing else in the app depends on the formula's shape.
 */
export interface ScoringStrategy {
  key: string;
  label: string;
  description: string;
  evaluateGuess(guess: Guess | null, trueAnswer: number): QuestionResult;
  /**
   * @param totalQuestions number of questions revealed so far (the
   *   leaderboard recomputes this after every reveal)
   * @param results one entry per revealed question for this participant
   */
  aggregate(totalQuestions: number, results: QuestionResult[]): number;
}
