export interface User {
  id: number;
  username: string;
  email: string;
  hero_rank: string;
  level: number;
  current_streak: number;
  max_streak?: number;
  avatar_url?: string;
  created_at?: string;
}

export interface ChallengeTarget {
  level: number;
  pushup_target: number;
  situp_target: number;
  squat_target: number;
  running_target_km: number;
  title: string;
  description?: string;
}

export interface DailyWorkoutProgress {
  id: number;
  user_id: number;
  workout_date: string;
  level: number;
  pushup_completed: number;
  situp_completed: number;
  squat_completed: number;
  running_completed_km: number;
  is_completed: boolean;
}

export interface TodayChallengeData {
  userLevel: number;
  heroRank: string;
  streak: number;
  target: ChallengeTarget;
  progress: DailyWorkoutProgress;
}

export interface AIWorkoutStatus {
  exercise: string;
  stage: 'up' | 'down' | null;
  total_reps: number;
  valid_reps: number;
  invalid_reps: number;
  form_score: number;
  feedback: string;
  is_form_valid: boolean;
}
