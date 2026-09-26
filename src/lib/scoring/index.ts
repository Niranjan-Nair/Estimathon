import type { ScoringStrategy } from "./types";
import { defaultStrategy } from "./default";

export type { Guess, QuestionResult, ScoringStrategy } from "./types";
export { defaultStrategy, createDefaultStrategy, DEFAULT_SCORING_BASE } from "./default";

// Registry of available strategies, keyed the same way as
// estimathons.scoring_strategy in the database. To add a strategy: write a
// new file exporting a ScoringStrategy, register it here, and add the
// matching SQL function + dispatch branch in supabase/schema.sql.
export const scoringStrategies: Record<string, ScoringStrategy> = {
  [defaultStrategy.key]: defaultStrategy,
};

export const DEFAULT_SCORING_STRATEGY = defaultStrategy.key;

export function getScoringStrategy(key: string): ScoringStrategy {
  return scoringStrategies[key] ?? scoringStrategies[DEFAULT_SCORING_STRATEGY];
}
