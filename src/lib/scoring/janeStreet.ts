import type { Guess, QuestionResult, ScoringStrategy } from "./types";

export const JANE_STREET_BASE = 10;

/**
 * Jane Street's Estimathon scoring rule.
 *
 * Teams submit a range [low, high] for each question. A guess is "correct"
 * if the true answer falls inside its range. The whole-game score is:
 *
 *   2^(N - correct) * (base + sum of ceil(high / low) over correct guesses)
 *
 * where N is the number of questions scored so far and `correct` is how
 * many of them the team got right. Missing or wrong guesses don't add to
 * the sum, but every one of them doubles the final score -- so being
 * correct on everything matters far more than how tight any single range
 * was. Lower total wins.
 */
export function createJaneStreetStrategy(base: number = JANE_STREET_BASE): ScoringStrategy {
  return {
    key: "jane_street",
    label: "Jane Street",
    description:
      "Score = 2^(questions − correct) × (10 + Σ ceil(high / low) over correct guesses). " +
      "Lower total score wins; every wrong or missing guess doubles your score.",
    evaluateGuess(guess: Guess | null, trueAnswer: number): QuestionResult {
      if (!guess) return { correct: false, ratio: 0 };
      const { low, high } = guess;
      const valid = Number.isFinite(low) && Number.isFinite(high) && low > 0 && high >= low;
      const correct = valid && trueAnswer >= low && trueAnswer <= high;
      return { correct, ratio: correct ? Math.ceil(high / low) : 0 };
    },
    aggregate(totalQuestions: number, results: QuestionResult[]): number {
      const correctResults = results.filter((r) => r.correct);
      const correctCount = correctResults.length;
      const sumRatios = correctResults.reduce((sum, r) => sum + r.ratio, 0);
      return 2 ** (totalQuestions - correctCount) * (base + sumRatios);
    },
  };
}

export const janeStreetStrategy = createJaneStreetStrategy();
