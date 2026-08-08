import { LocalizedName } from './lookup.model';

/** One question of an exam, as returned by `GET /exam/{id}`. */
export interface ExamQuestion {
  id: number;
  name: LocalizedName;
  rank: number;
}

/** One row of `GET /exam?filters...` — an exam available to the current tester. */
export interface ExamSummary {
  id: number;
  name: LocalizedName;
}

/** Shape of `GET /exam/{id}` — the selected exam with its full question list. */
export interface ExamDetail extends ExamSummary {
  questions: ExamQuestion[];
}

/** One scored exam question, as sent to `POST /tester/{testerId}/evaluate`. */
export interface TesterEvaluationEntry {
  examQuestionId: number;
  grade: number;
}

/** Body of `POST /tester/{testerId}/evaluate`. */
export interface TesterEvaluateRequest {
  participantId: number;
  grades: TesterEvaluationEntry[];
}

/** One previously-submitted grade, as nested in `GET /participant/{id}`'s `grades` array. */
export interface ParticipantGradeEntry {
  examQuestion: {
    question: { id: number; name: LocalizedName; rank: number };
    exam: { id: number; name: LocalizedName };
  };
  grade: number;
}

/**
 * One row of `GET /participant/grades?filters.participant.id=...` — a previously-submitted
 * grade for one exam question, identified only by its `rank` (this endpoint has no question
 * id, unlike `ParticipantGradeEntry`).
 */
export interface ParticipantRankedGrade {
  rank: number;
  grade: number;
  tester: { id: number; name: LocalizedName };
}

/** The subset of `GET /participant/{id}` this app reads — to pre-fill a resubmission and to show the results screen. */
export interface ParticipantEvaluationDetail {
  id: number;
  score: number | null;
  user: { id: number; name: LocalizedName; nationalId: number };
  competition: { id: number; name: LocalizedName };
  level: { id: number; name: LocalizedName };
  grades: ParticipantGradeEntry[];
}
