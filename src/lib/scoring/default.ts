import type { EvaluateOptions, Guess, QuestionResult, ScoringStrategy } from "./types";

export const DEFAULT_SCORING_BASE = 10;

/**
 * The default scoring rule, based on the format used at Jane Street's
 * public Estimathon events.
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
 *
 * Order-of-magnitude mode is purely an input convenience (see Play.tsx):
 * the player types two powers of ten, which get converted to
 * low = 10^minExponent and high = 10^maxExponent before being saved as an
 * ordinary guess. Since that's already a valid raw range, it scores with
 * exactly the same rule as any other guess -- no special-casing needed
 * here. `options` is accepted for interface stability (a future strategy
 * might want to treat it differently) but this one ignores it.
 */
export function createDefaultStrategy(base: number = DEFAULT_SCORING_BASE): ScoringStrategy {
  return {
    key: "default",
    label: "Default",
    description:
      "Score = 2^(questions − correct) × (10 + Σ ceil(high / low) over correct guesses). " +
      "Lower total score wins; every wrong or missing guess doubles your score.",
    evaluateGuess(guess: Guess | null, trueAnswer: number, _options?: EvaluateOptions): QuestionResult {
      if (!guess) return { correct: false, ratio: 0 };
      const { low, high } = guess;
      const valid = Number.isFinite(low) && Number.isFinite(high) && low > 0 && high >= low;
      if (!valid) return { correct: false, ratio: 0 };

      const correct = trueAnswer >= low && trueAnswer <= high;
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

export const defaultStrategy = createDefaultStrategy();
