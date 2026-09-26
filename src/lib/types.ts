export type EstimathonStatus = "draft" | "active" | "finished";

export interface Estimathon {
  id: string;
  name: string;
  host_id: string;
  host_name: string;
  join_code: string;
  status: EstimathonStatus;
  current_question_index: number;
  scoring_strategy: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionPublic {
  id: string;
  estimathon_id: string;
  order_index: number;
  prompt: string;
  revealed: boolean;
  revealed_at: string | null;
  true_answer: number | null;
  unit: string | null;
  use_magnitude: boolean;
}

export interface QuestionHost extends QuestionPublic {
  true_answer: number;
}

export interface Participant {
  id: string;
  estimathon_id: string;
  user_id: string;
  display_name: string;
  created_at: string;
}

export interface GuessRow {
  id: string;
  estimathon_id: string;
  question_id: string;
  participant_id: string;
  low: number;
  high: number;
  submitted_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  participant_id: string;
  display_name: string;
  total: number;
  correctCount: number;
  answeredCount: number;
}
