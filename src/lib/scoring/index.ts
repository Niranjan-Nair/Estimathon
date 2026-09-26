import type { ScoringStrategy } from "./types";
import { janeStreetStrategy } from "./janeStreet";

export type { Guess, QuestionResult, ScoringStrategy } from "./types";
export { janeStreetStrategy, createJaneStreetStrategy, JANE_STREET_BASE } from "./janeStreet";

// Registry of available strategies, keyed the same way as
// estimathons.scoring_strategy in the database. To add a strategy: write a
// new file exporting a ScoringStrategy, register it here, and add the
// matching SQL function + dispatch branch in supabase/schema.sql.
export const scoringStrategies: Record<string, ScoringStrategy> = {
  [janeStreetStrategy.key]: janeStreetStrategy,
};

export const DEFAULT_SCORING_STRATEGY = janeStreetStrategy.key;

export function getScoringStrategy(key: string): ScoringStrategy {
  return scoringStrategies[key] ?? scoringStrategies[DEFAULT_SCORING_STRATEGY];
}
