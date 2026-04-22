export type Stance = 'orthodox' | 'southpaw';

export type MovementType = 'slip_left' | 'slip_right' | 'duck' | 'pull_back';

export type PunchType = 1 | 2 | 3 | 4 | 5 | 6;

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  stance: Stance | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  total_punches: number;
  total_defensive_moves: number;
  avg_form_score: number | null;
  combo_attempts: number;
  combo_accuracy: number | null;
}

export interface PunchLog {
  id: string;
  session_id: string;
  punch_type: PunchType;
  form_score: number | null;
  timestamp: string;
}

export interface MovementLog {
  id: string;
  session_id: string;
  movement_type: MovementType;
  form_score: number | null;
  timestamp: string;
}

export interface ComboResult {
  id: string;
  session_id: string;
  combo_name: string;
  sequence: string;
  punches_matched: number;
  form_score: number | null;
  completed_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id' | 'started_at'>;
        Update: Partial<Omit<Session, 'id' | 'user_id'>>;
      };
      punch_logs: {
        Row: PunchLog;
        Insert: Omit<PunchLog, 'id' | 'timestamp'>;
        Update: Partial<Omit<PunchLog, 'id' | 'session_id'>>;
      };
      movement_logs: {
        Row: MovementLog;
        Insert: Omit<MovementLog, 'id' | 'timestamp'>;
        Update: Partial<Omit<MovementLog, 'id' | 'session_id'>>;
      };
      combo_results: {
        Row: ComboResult;
        Insert: Omit<ComboResult, 'id' | 'completed_at'>;
        Update: Partial<Omit<ComboResult, 'id' | 'session_id'>>;
      };
    };
  };
}
