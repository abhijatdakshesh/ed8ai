import { apiGet, apiPost } from '@/lib/api/client';

import { mockCallLogsResponse } from './mock-data';
import type { CallLogsResponse, CallRecord, CallState, CallType, Language, TriggerCallRequest, TriggerCallResult } from './types';

const USE_MOCK = (process.env.NEXT_PUBLIC_USE_MOCKS ?? 'false') === 'true';

export interface CallLogsFilters {
  callType?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// Backend AICallLog shape
interface AICallLog {
  id: string;
  calledAt: string;
  studentName: string;
  studentUsn: string;
  parentId: string;
  language?: string;
  outcome: 'ANSWERED' | 'VOICEMAIL' | 'NO_ANSWER' | 'BUSY' | 'FAILED';
  duration: number;
  summary?: string;
  institutionId?: string;
}

// Backend trigger response
interface BackendTriggerResponse {
  callId: string;
  status: string;
  scheduledAt?: string;
}

const OUTCOME_TO_STATE: Record<string, CallState> = {
  ANSWERED: 'COMPLETED',
  VOICEMAIL: 'COMPLETED',
  NO_ANSWER: 'NO_ANSWER',
  BUSY: 'BUSY',
  FAILED: 'FAILED',
};

function mapLog(log: AICallLog): CallRecord {
  const rec: CallRecord = {
    id: log.id,
    studentId: log.studentUsn,
    studentName: log.studentName,
    language: (log.language as Language | undefined) ?? 'en',
    callType: 'ABSENT_CALL' as CallType,
    state: OUTCOME_TO_STATE[log.outcome] ?? 'FAILED',
    escalated: false,
    whatsappSent: false,
    createdAt: log.calledAt,
  };
  if (log.duration > 0) rec.durationSecs = log.duration;
  if (log.summary) rec.summaryEn = log.summary;
  return rec;
}

export async function triggerCall(req: TriggerCallRequest): Promise<TriggerCallResult> {
  if (USE_MOCK) {
    return { callId: 'call-mock-' + Date.now().toString(), status: 'INITIATED', message: 'Call queued successfully' };
  }
  // Backend exposes the call trigger at /api/comms/calls/trigger with a
  // simplified body shape. Earlier the FE pointed at a non-existent
  // /api/voice/trigger endpoint → prod returned 502/404 (KAN-17).
  // Use apiPost so token refresh + 401 retry work (Daniel: don't bypass apiFetch).
  try {
    const res = await apiPost<Partial<BackendTriggerResponse> & { id?: string; status?: string }>(
      '/api/comms/calls/trigger',
      {
        studentUsn: req.studentId,
        type: req.callType,
        language: req.language ?? 'en',
        parentPhone: req.parentPhone,
      },
    );
    return {
      callId: res.callId ?? res.id ?? `call-${Date.now()}`,
      status: res.status ?? 'INITIATED',
      message: 'Call queued successfully',
    };
  } catch (err) {
    // Operator must see real failures — do not synthesize success.
    const msg = err instanceof Error ? err.message : 'Voice trigger failed';
    throw new Error(msg);
  }
}

/**
 * Record DPDP voice consent for a principal (admin-attested) before a call.
 * The operator has confirmed the parent opted in; this persists that consent
 * so the backend trigger gate passes. Deliberate, logged act — not a bypass.
 */
export async function grantVoiceConsent(usn: string): Promise<void> {
  if (USE_MOCK) return;
  await apiPost('/api/comms/consent/grant', { usn });
}

// GoVoiceCallStatus is the shape returned by the Go voice service
interface GoVoiceCallStatus {
  callId: string;
  state: string;
  language: string;
  callType: string;
}

export async function getCallStatus(callId: string): Promise<CallRecord> {
  if (USE_MOCK) {
    const found = mockCallLogsResponse.calls.find((c) => c.id === callId);
    return found ?? { id: callId, studentId: '', studentName: '', language: 'kn', callType: 'ABSENT_CALL', state: 'COMPLETED', escalated: false, whatsappSent: false, createdAt: new Date().toISOString() };
  }
  try {
    // Use relative URL so request hits the Next.js BFF route, not NEXT_PUBLIC_API_BASE_URL
    const raw = await fetch(`/api/voice/status?callId=${encodeURIComponent(callId)}`);
    if (!raw.ok) throw new Error(`Status fetch failed: ${raw.status}`);
    const data = (await raw.json()) as GoVoiceCallStatus;
    return {
      id: data.callId,
      studentId: '',
      studentName: '',
      language: (data.language as Language) ?? 'en',
      callType: (data.callType as CallType) ?? 'ABSENT_CALL',
      state: (data.state as CallState) ?? 'INITIATED',
      escalated: false,
      whatsappSent: false,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return { id: callId, studentId: '', studentName: '', language: 'kn', callType: 'ABSENT_CALL', state: 'INITIATED', escalated: false, whatsappSent: false, createdAt: new Date().toISOString() };
  }
}

export async function getCallLogs(filters: CallLogsFilters = {}): Promise<CallLogsResponse> {
  if (USE_MOCK) return mockCallLogsResponse;
  try {
    const logs = await apiGet<AICallLog[]>('/api/admin/calls/logs');
    let mapped = logs.map(mapLog);
    if (filters.callType) mapped = mapped.filter((c) => c.callType === filters.callType);
    if (filters.status) mapped = mapped.filter((c) => c.state === filters.status);
    if (filters.from) mapped = mapped.filter((c) => c.createdAt >= filters.from!);
    if (filters.to) mapped = mapped.filter((c) => c.createdAt <= filters.to! + 'T23:59:59Z');
    return { calls: mapped, total: mapped.length };
  } catch {
    return mockCallLogsResponse;
  }
}
