export type CallType = 'ADMISSION_OUTREACH' | 'ABSENT_CALL' | 'FEE_REMINDER' | 'WEEKLY_UPDATE' | 'ASSIGNMENT_MISS' | 'EXAM_REMINDER';

export type CallState =
  | 'INITIATED'
  | 'RINGING'
  | 'CONNECTED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'ALL_RETRIES_EXHAUSTED';

export type Language =
  | 'en' | 'hi' | 'kn' | 'ta' | 'te'
  | 'mr' | 'bn' | 'gu' | 'ml' | 'pa' | 'or';

export type TurnRole = 'AI' | 'PARENT';

export interface Turn {
  turn: number;
  role: TurnRole;
  text: string;
  language: string;
  ts: string;
}

export interface CallRecord {
  id: string;
  studentId: string;
  studentName: string;
  language: Language;
  callType: CallType;
  state: CallState;
  durationSecs?: number;
  collectedReason?: string;
  escalated: boolean;
  summaryEn?: string;
  parentResponse?: string;
  whatsappSent: boolean;
  createdAt: string;
  connectedAt?: string;
  endedAt?: string;
  turns?: Turn[];
  live?: boolean;
}

export interface TriggerCallRequest {
  studentId: string;
  parentPhone: string;
  callType: CallType;
  language: Language;
  institutionId?: string;
  studentContext: Record<string, unknown>;
}

export interface TriggerCallResult {
  callId: string;
  status: string;
  message: string;
}

export interface CallLogsResponse {
  calls: CallRecord[];
  total: number;
}
