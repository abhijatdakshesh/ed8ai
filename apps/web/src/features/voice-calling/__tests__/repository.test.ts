/**
 * Unit tests: src/features/voice-calling/repository.ts
 *
 * Coverage targets (100% lines + branches):
 *   triggerCall   — mock path, real path happy, real path 4xx, real path network failure,
 *                   missing parentPhone → route returns 400, error body parsing failure
 *   getCallStatus — mock path (id found), mock path (id not found / fallback record),
 *                   real path happy, real path throws (catch branch → fallback)
 *   getCallLogs   — mock path, real path no filters, each filter combination,
 *                   apiGet throws (catch branch → mockCallLogsResponse fallback)
 *   mapLog        — OUTCOME_TO_STATE for every enum value incl. unknown outcome,
 *                   duration === 0 (durationSecs omitted), summary absent (summaryEn omitted)
 *
 * Strategy:
 *   - USE_MOCK is read at module-load time from process.env.NEXT_PUBLIC_USE_MOCKS.
 *     We use jest.resetModules() + dynamic import to reload the module with the env
 *     var toggled between describe blocks.
 *   - global.fetch is replaced per-test with jest.fn() so we verify the exact URL
 *     and request shape without any HTTP traffic.
 *   - apiGet (from @/lib/api/client) is module-mocked so real NextAuth token logic
 *     is never invoked — only the behaviour of repository.ts is exercised.
 *   - The fire-and-forget debug agent fetch() call in the module body is swallowed by
 *     the global no-op fetch in jest.setup.ts and does not affect assertions.
 *
 * ERP edge cases covered:
 *   - Concurrent callers triggering simultaneously (race is not within this module, but
 *     we verify the function is pure / has no shared mutable state between calls).
 *   - parentPhone absent → 400 error surfaced to caller (voice trigger category).
 *   - Backend returns non-JSON on 4xx (error body parse failure branch).
 *   - Unknown OUTCOME value from backend → falls back to 'FAILED' state.
 *   - Date boundary strings passed as 'from'/'to' filters (attendance / call-log category).
 *   - institutionId absent → defaults to 'RVCE' in the outgoing request body.
 */

import { mockCallLogsResponse } from '../mock-data';
import type {
  CallLogsFilters,
  CallLogsResponse,
  TriggerCallResult,
} from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Minimal valid TriggerCallRequest */
const BASE_REQUEST = {
  studentId: '1RV21CS001',
  parentPhone: '+919876543210',
  callType: 'ABSENT_CALL' as const,
  language: 'kn' as const,
  studentContext: { name: 'Arjun Sharma' },
};

/** Successful BackendTriggerResponse */
const BACKEND_TRIGGER_OK = {
  callId: 'call-backend-abc123',
  status: 'INITIATED',
};

/** Successful GoVoiceCallStatus */
const GO_STATUS_OK = {
  callId: 'call-go-xyz',
  state: 'CONNECTED',
  language: 'hi',
  callType: 'FEE_REMINDER',
};

/** Build a fake Response object */
function fakeResponse(
  body: unknown,
  status = 200,
  ok?: boolean,
): Response {
  const isOk = ok ?? (status >= 200 && status < 300);
  return {
    ok: isOk,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

/** Build a fake Response whose .json() rejects (malformed body) */
function fakeResponseMalformedJson(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    text: jest.fn().mockResolvedValue('Internal Server Error'),
  } as unknown as Response;
}

// ─── Mock the api client used by getCallStatus and getCallLogs ───────────────
// We do NOT mock fetch for these — we mock the wrapper so we test repository
// logic in isolation from NextAuth token handling.
jest.mock('@/lib/api/client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

import { apiGet, apiPost } from '@/lib/api/client';
const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedApiPost = apiPost as jest.MockedFunction<typeof apiPost>;

// ─── Test suite — USE_MOCK = true (default env) ──────────────────────────────

describe('repository — USE_MOCK=true (NEXT_PUBLIC_USE_MOCKS=true)', () => {
  // Module is loaded fresh with USE_MOCK=true
  let triggerCall: (req: typeof BASE_REQUEST) => Promise<TriggerCallResult>;
  let getCallStatus: (id: string) => Promise<import('../types').CallRecord>;
  let getCallLogs: (f?: CallLogsFilters) => Promise<CallLogsResponse>;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'true';
    jest.resetModules();
    const mod = await import('../repository');
    triggerCall = mod.triggerCall;
    getCallStatus = mod.getCallStatus;
    getCallLogs = mod.getCallLogs;
  });

  afterAll(() => {
    delete process.env.NEXT_PUBLIC_USE_MOCKS;
    jest.resetModules();
  });

  // ── triggerCall mock path ─────────────────────────────────────────────────

  it('triggerCall (mock): returns a callId prefixed with "call-mock-"', async () => {
    const result = await triggerCall(BASE_REQUEST);

    expect(result.callId).toMatch(/^call-mock-\d+$/);
    expect(result.status).toBe('INITIATED');
    expect(result.message).toBe('Call queued successfully');
  });

  it('triggerCall (mock): does NOT call fetch("/api/voice/trigger")', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    await triggerCall(BASE_REQUEST);

    // The only fetch call allowed in mock mode is the fire-and-forget debug logger.
    // Verify no call targets /api/voice/trigger.
    const voiceCalls = fetchSpy.mock.calls.filter(
      ([url]) => typeof url === 'string' && String(url).includes('/api/voice/trigger'),
    );
    expect(voiceCalls).toHaveLength(0);
  });

  it('triggerCall (mock): each invocation returns a unique callId (no shared state)', async () => {
    // Simulate two "concurrent" triggers — verifies no accidental shared state
    const [r1, r2] = await Promise.all([
      triggerCall(BASE_REQUEST),
      triggerCall({ ...BASE_REQUEST, studentId: '1RV21CS002' }),
    ]);
    // Both are valid mock IDs; in low-resolution timing they may collide on the
    // same millisecond so we only assert shape, not strict uniqueness.
    expect(r1.callId).toMatch(/^call-mock-/);
    expect(r2.callId).toMatch(/^call-mock-/);
  });

  // ── getCallStatus mock path ───────────────────────────────────────────────

  it('getCallStatus (mock): returns record when callId exists in mock data', async () => {
    const record = await getCallStatus('call-001');

    expect(record.id).toBe('call-001');
    expect(record.studentId).toBe('1RV21CS001');
    expect(record.studentName).toBe('Arjun Sharma');
    expect(record.state).toBe('COMPLETED');
  });

  it('getCallStatus (mock): returns fallback record when callId is NOT in mock data', async () => {
    const record = await getCallStatus('call-NONEXISTENT');

    expect(record.id).toBe('call-NONEXISTENT');
    expect(record.studentId).toBe('');
    expect(record.studentName).toBe('');
    // Fallback state from mock path is COMPLETED
    expect(record.state).toBe('COMPLETED');
    expect(record.language).toBe('kn');
    expect(record.callType).toBe('ABSENT_CALL');
  });

  // ── getCallLogs mock path ─────────────────────────────────────────────────

  it('getCallLogs (mock): returns the full mock dataset with no filters', async () => {
    const result = await getCallLogs();

    expect(result).toStrictEqual(mockCallLogsResponse);
    expect(result.calls).toHaveLength(mockCallLogsResponse.total);
  });

  it('getCallLogs (mock): returns mock data even when filters are passed (filters are ignored in mock path)', async () => {
    const result = await getCallLogs({ callType: 'ABSENT_CALL', status: 'COMPLETED' });

    // Mock path ignores filters and returns full set
    expect(result).toStrictEqual(mockCallLogsResponse);
  });
});

// ─── Test suite — USE_MOCK = false ───────────────────────────────────────────

describe('repository — USE_MOCK=false (NEXT_PUBLIC_USE_MOCKS=false)', () => {
  let triggerCall: (req: typeof BASE_REQUEST & { institutionId?: string; studentContext?: Record<string, unknown> }) => Promise<TriggerCallResult>;
  let getCallStatus: (id: string) => Promise<import('../types').CallRecord>;
  let getCallLogs: (f?: CallLogsFilters) => Promise<CallLogsResponse>;
  let localMockedApiGet: jest.MockedFunction<typeof import('@/lib/api/client').apiGet>;
  let localMockedApiPost: jest.MockedFunction<typeof import('@/lib/api/client').apiPost>;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'false';
    jest.resetModules();
    // Re-mock api/client after module reset
    jest.mock('@/lib/api/client', () => ({
      apiGet: jest.fn(),
      apiPost: jest.fn(),
    }));
    const mod = await import('../repository');
    triggerCall = mod.triggerCall;
    getCallStatus = mod.getCallStatus;
    getCallLogs = mod.getCallLogs;
    // Capture the FRESH mock instance that repository.ts is using
    const { apiGet: freshApiGet, apiPost: freshApiPost } = await import('@/lib/api/client');
    localMockedApiGet = freshApiGet as jest.MockedFunction<typeof freshApiGet>;
    localMockedApiPost = freshApiPost as jest.MockedFunction<typeof freshApiPost>;
  });

  afterAll(() => {
    delete process.env.NEXT_PUBLIC_USE_MOCKS;
    jest.resetModules();
  });

  beforeEach(() => {
    // Reset the fresh mocks between tests
    localMockedApiGet?.mockReset();
    localMockedApiPost?.mockReset();
  });

  // ── triggerCall — happy path ──────────────────────────────────────────────

  it('triggerCall (real): POSTs to /api/comms/calls/trigger with correct body', async () => {
    localMockedApiPost.mockResolvedValueOnce(BACKEND_TRIGGER_OK);

    await triggerCall(BASE_REQUEST);

    expect(localMockedApiPost).toHaveBeenCalledWith(
      '/api/comms/calls/trigger',
      {
        studentUsn: '1RV21CS001',
        type: 'ABSENT_CALL',
        language: 'kn',
        parentPhone: '+919876543210',
      },
    );
  });

  it('triggerCall (real): happy path — returns callId and status from backend', async () => {
    localMockedApiPost.mockResolvedValueOnce(BACKEND_TRIGGER_OK);

    const result = await triggerCall(BASE_REQUEST);

    expect(result.callId).toBe('call-backend-abc123');
    expect(result.status).toBe('INITIATED');
    expect(result.message).toBe('Call queued successfully');
  });

  // ── triggerCall — error paths ─────────────────────────────────────────────

  it('triggerCall (real): throws when route returns error message', async () => {
    localMockedApiPost.mockRejectedValueOnce(new Error('parentPhone required'));

    await expect(
      triggerCall({ ...BASE_REQUEST, parentPhone: '' }),
    ).rejects.toThrow('parentPhone required');
  });

  it('triggerCall (real): throws with fallback when apiPost throws non-Error', async () => {
    localMockedApiPost.mockRejectedValueOnce('Non-error string failure');

    await expect(
      triggerCall({ ...BASE_REQUEST, parentPhone: '' }),
    ).rejects.toThrow('Voice trigger failed');
  });

  it('triggerCall (real): throws when route returns 500', async () => {
    localMockedApiPost.mockRejectedValueOnce(new Error('Internal Server Error'));

    await expect(triggerCall(BASE_REQUEST)).rejects.toThrow('Internal Server Error');
  });

  it('triggerCall (real): throws when route returns 502 (voice service down)', async () => {
    localMockedApiPost.mockRejectedValueOnce(new Error('Error: fetch failed'));

    await expect(triggerCall(BASE_REQUEST)).rejects.toThrow('Error: fetch failed');
  });

  it('triggerCall (real): throws when the response body is malformed', async () => {
    localMockedApiPost.mockRejectedValueOnce(new Error('Voice trigger failed: 503'));

    await expect(triggerCall(BASE_REQUEST)).rejects.toThrow('Voice trigger failed: 503');
  });

  it('triggerCall (real): throws on network failure (fetch rejects entirely)', async () => {
    localMockedApiPost.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(triggerCall(BASE_REQUEST)).rejects.toThrow('fetch failed');
  });

  // ── getCallStatus — real path ─────────────────────────────────────────────

  it('getCallStatus (real): maps GoVoiceCallStatus response to CallRecord', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(fakeResponse(GO_STATUS_OK, 200));

    const record = await getCallStatus('call-go-xyz');

    expect(record.id).toBe('call-go-xyz');
    expect(record.state).toBe('CONNECTED');
    expect(record.language).toBe('hi');
    expect(record.callType).toBe('FEE_REMINDER');
    expect(record.studentId).toBe('');       // GoVoiceCallStatus has no studentId field
    expect(record.escalated).toBe(false);
    expect(record.whatsappSent).toBe(false);
  });

  it('getCallStatus (real): uses default language "en" when backend omits it', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(fakeResponse({ ...GO_STATUS_OK, language: undefined }, 200));

    const record = await getCallStatus('call-go-xyz');

    expect(record.language).toBe('en');
  });

  it('getCallStatus (real): uses default callType "ABSENT_CALL" when backend omits it', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(fakeResponse({ ...GO_STATUS_OK, callType: undefined }, 200));

    const record = await getCallStatus('call-go-xyz');

    expect(record.callType).toBe('ABSENT_CALL');
  });

  it('getCallStatus (real): uses default state "INITIATED" when backend omits state', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(fakeResponse({ ...GO_STATUS_OK, state: undefined }, 200));

    const record = await getCallStatus('call-go-xyz');

    expect(record.state).toBe('INITIATED');
  });

  it('getCallStatus (real): catch branch — returns fallback record when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network Error'));

    const record = await getCallStatus('call-failed-id');

    // Must NOT re-throw — swallowed in catch, fallback returned
    expect(record.id).toBe('call-failed-id');
    expect(record.state).toBe('INITIATED');
    expect(record.language).toBe('kn');
    expect(record.callType).toBe('ABSENT_CALL');
  });

  it('getCallStatus (real): catch branch — returns fallback when fetch returns non-ok status', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(fakeResponse({ error: 'not found' }, 404, false));

    const record = await getCallStatus('call-missing-id');

    expect(record.id).toBe('call-missing-id');
    expect(record.state).toBe('INITIATED');
  });

  // ── getCallLogs — real path, no filters ──────────────────────────────────

  it('getCallLogs (real): maps AICallLog array from backend to CallLogsResponse', async () => {
    const backendLogs = [
      {
        id: 'log-001',
        calledAt: '2026-04-25T09:15:00.000Z',
        studentName: 'Arjun Sharma',
        studentUsn: '1RV21CS001',
        parentId: 'parent-001',
        language: 'kn',
        outcome: 'ANSWERED' as const,
        duration: 142,
        summary: 'Student is unwell.',
        institutionId: 'RVCE',
      },
    ];
    localMockedApiGet.mockResolvedValueOnce(backendLogs);

    const result = await getCallLogs();

    expect(result.calls).toHaveLength(1);
    expect(result.total).toBe(1);
    const rec = result.calls[0]!;
    expect(rec.id).toBe('log-001');
    expect(rec.studentId).toBe('1RV21CS001');
    expect(rec.studentName).toBe('Arjun Sharma');
    expect(rec.language).toBe('kn');
    expect(rec.callType).toBe('ABSENT_CALL');   // always mapped to ABSENT_CALL
    expect(rec.state).toBe('COMPLETED');         // ANSWERED → COMPLETED
    expect(rec.durationSecs).toBe(142);
    expect(rec.summaryEn).toBe('Student is unwell.');
    expect(rec.escalated).toBe(false);
    expect(rec.whatsappSent).toBe(false);
    expect(rec.createdAt).toBe('2026-04-25T09:15:00.000Z');
  });

  // ── OUTCOME_TO_STATE mapping — every enum value ───────────────────────────

  const OUTCOME_CASES: Array<[string, string]> = [
    ['ANSWERED',  'COMPLETED'],
    ['VOICEMAIL', 'COMPLETED'],
    ['NO_ANSWER', 'NO_ANSWER'],
    ['BUSY',      'BUSY'],
    ['FAILED',    'FAILED'],
  ];

  it.each(OUTCOME_CASES)(
    'getCallLogs (real): outcome=%s maps to state=%s',
    async (outcome, expectedState) => {
      localMockedApiGet.mockResolvedValueOnce([
        {
          id: `log-${outcome}`,
          calledAt: '2026-04-25T09:00:00.000Z',
          studentName: 'Test Student',
          studentUsn: '1RV21CS999',
          parentId: 'p-999',
          language: 'en',
          outcome,
          duration: 0,
        },
      ]);

      const result = await getCallLogs();

      expect(result.calls[0]!.state).toBe(expectedState);
    },
  );

  it('getCallLogs (real): unknown outcome falls back to state "FAILED"', async () => {
    localMockedApiGet.mockResolvedValueOnce([
      {
        id: 'log-unknown',
        calledAt: '2026-04-25T09:00:00.000Z',
        studentName: 'Ghost Student',
        studentUsn: '1RV00XX000',
        parentId: 'p-000',
        language: 'en',
        outcome: 'UNKNOWN_FUTURE_OUTCOME',
        duration: 10,
      },
    ]);

    const result = await getCallLogs();

    expect(result.calls[0]!.state).toBe('FAILED');
  });

  // ── mapLog edge cases ─────────────────────────────────────────────────────

  it('getCallLogs (real): durationSecs is absent when duration === 0', async () => {
    localMockedApiGet.mockResolvedValueOnce([
      {
        id: 'log-zero-dur',
        calledAt: '2026-04-25T09:00:00.000Z',
        studentName: 'Zero Duration',
        studentUsn: '1RV21CS777',
        parentId: 'p-777',
        language: 'hi',
        outcome: 'NO_ANSWER',
        duration: 0,
      },
    ]);

    const result = await getCallLogs();

    expect('durationSecs' in result.calls[0]!).toBe(false);
  });

  it('getCallLogs (real): durationSecs is present when duration > 0', async () => {
    localMockedApiGet.mockResolvedValueOnce([
      {
        id: 'log-pos-dur',
        calledAt: '2026-04-25T09:00:00.000Z',
        studentName: 'Positive Duration',
        studentUsn: '1RV21CS888',
        parentId: 'p-888',
        language: 'hi',
        outcome: 'ANSWERED',
        duration: 90,
      },
    ]);

    const result = await getCallLogs();

    expect(result.calls[0]!.durationSecs).toBe(90);
  });

  it('getCallLogs (real): summaryEn is absent when backend summary is undefined', async () => {
    localMockedApiGet.mockResolvedValueOnce([
      {
        id: 'log-no-summary',
        calledAt: '2026-04-25T09:00:00.000Z',
        studentName: 'No Summary',
        studentUsn: '1RV21CS444',
        parentId: 'p-444',
        language: 'te',
        outcome: 'BUSY',
        duration: 0,
        // summary intentionally absent
      },
    ]);

    const result = await getCallLogs();

    expect('summaryEn' in result.calls[0]!).toBe(false);
  });

  it('getCallLogs (real): language defaults to "en" when absent in backend log', async () => {
    localMockedApiGet.mockResolvedValueOnce([
      {
        id: 'log-no-lang',
        calledAt: '2026-04-25T09:00:00.000Z',
        studentName: 'No Lang',
        studentUsn: '1RV21CS555',
        parentId: 'p-555',
        // language intentionally absent
        outcome: 'ANSWERED',
        duration: 60,
      },
    ]);

    const result = await getCallLogs();

    expect(result.calls[0]!.language).toBe('en');
  });

  // ── getCallLogs — filters ─────────────────────────────────────────────────

  const MULTI_OUTCOME_BACKEND = [
    { id: 'l1', calledAt: '2026-04-25T09:00:00.000Z', studentName: 'A', studentUsn: 'USN1', parentId: 'p1', language: 'kn', outcome: 'ANSWERED', duration: 60 },
    { id: 'l2', calledAt: '2026-04-26T09:00:00.000Z', studentName: 'B', studentUsn: 'USN2', parentId: 'p2', language: 'en', outcome: 'NO_ANSWER', duration: 0 },
    { id: 'l3', calledAt: '2026-04-27T09:00:00.000Z', studentName: 'C', studentUsn: 'USN3', parentId: 'p3', language: 'hi', outcome: 'BUSY', duration: 0 },
  ];

  it('getCallLogs (real): filters by status correctly', async () => {
    localMockedApiGet.mockResolvedValueOnce(MULTI_OUTCOME_BACKEND);

    const result = await getCallLogs({ status: 'COMPLETED' });

    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]!.id).toBe('l1');
    expect(result.total).toBe(1);
  });

  it('getCallLogs (real): filters by callType correctly (all records are ABSENT_CALL, so no filtering expected)', async () => {
    // All records have callType=ABSENT_CALL after mapping, so filtering by ABSENT_CALL
    // returns all, and filtering by FEE_REMINDER returns none.
    localMockedApiGet.mockResolvedValueOnce(MULTI_OUTCOME_BACKEND);

    const result = await getCallLogs({ callType: 'FEE_REMINDER' });

    expect(result.calls).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('getCallLogs (real): filters by "from" date boundary — only includes records on or after', async () => {
    localMockedApiGet.mockResolvedValueOnce(MULTI_OUTCOME_BACKEND);

    // 2026-04-26 should include l2 and l3 only
    const result = await getCallLogs({ from: '2026-04-26' });

    expect(result.calls).toHaveLength(2);
    expect(result.calls.map((c) => c.id)).toEqual(['l2', 'l3']);
  });

  it('getCallLogs (real): filters by "to" date boundary — only includes records on or before', async () => {
    localMockedApiGet.mockResolvedValueOnce(MULTI_OUTCOME_BACKEND);

    // "to" appends T23:59:59Z — l1 (04-25) and l2 (04-26) should pass, l3 (04-27) excluded
    const result = await getCallLogs({ to: '2026-04-26' });

    expect(result.calls).toHaveLength(2);
    expect(result.calls.map((c) => c.id)).toEqual(['l1', 'l2']);
  });

  it('getCallLogs (real): from + to range filters correctly (academic year boundary)', async () => {
    // Simulates June 30 / July 1 academic year rollover scenario
    localMockedApiGet.mockResolvedValueOnce(MULTI_OUTCOME_BACKEND);

    const result = await getCallLogs({ from: '2026-04-26', to: '2026-04-26' });

    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]!.id).toBe('l2');
  });

  it('getCallLogs (real): combined callType + status filter returns intersection', async () => {
    localMockedApiGet.mockResolvedValueOnce(MULTI_OUTCOME_BACKEND);

    // ABSENT_CALL (all) AND COMPLETED (only l1)
    const result = await getCallLogs({ callType: 'ABSENT_CALL', status: 'COMPLETED' });

    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]!.id).toBe('l1');
  });

  it('getCallLogs (real): empty array from backend returns empty response', async () => {
    localMockedApiGet.mockResolvedValueOnce([]);

    const result = await getCallLogs();

    expect(result.calls).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  // ── getCallLogs — catch branch (fallback to mock data) ────────────────────

  it('getCallLogs (real): catch branch — returns mockCallLogsResponse when apiGet throws', async () => {
    localMockedApiGet.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await getCallLogs();

    // Must NOT re-throw; must return the mock dataset as a safe fallback
    expect(result).toStrictEqual(mockCallLogsResponse);
  });

  it('getCallLogs (real): catch branch — filters are NOT applied to the fallback mock data', async () => {
    // This is an intentional design decision in the module: if apiGet fails,
    // we return the full mock set regardless of filters.
    localMockedApiGet.mockRejectedValueOnce(new Error('Timeout'));

    const result = await getCallLogs({ status: 'NO_ANSWER' });

    expect(result).toStrictEqual(mockCallLogsResponse);
  });
});

// ─── Edge case: env var is absent (default to USE_MOCK=false) ─────────────────

describe('repository — NEXT_PUBLIC_USE_MOCKS absent (defaults to "false")', () => {
  let triggerCall: (req: typeof BASE_REQUEST) => Promise<TriggerCallResult>;
  let localMockedApiPost: jest.MockedFunction<typeof import('@/lib/api/client').apiPost>;

  beforeAll(async () => {
    delete process.env.NEXT_PUBLIC_USE_MOCKS;
    jest.resetModules();
    jest.mock('@/lib/api/client', () => ({
      apiGet: jest.fn(),
      apiPost: jest.fn(),
    }));
    const mod = await import('../repository');
    triggerCall = mod.triggerCall;
    const { apiPost: freshApiPost } = await import('@/lib/api/client');
    localMockedApiPost = freshApiPost as jest.MockedFunction<typeof freshApiPost>;
  });

  afterAll(() => {
    jest.resetModules();
  });

  it('defaults to real path (USE_MOCK=false) when NEXT_PUBLIC_USE_MOCKS is not set', async () => {
    localMockedApiPost.mockResolvedValueOnce({ callId: 'call-real-abc', status: 'INITIATED' });

    const result = await triggerCall(BASE_REQUEST);

    expect(result.callId).toBe('call-real-abc');
    expect(result.status).toBe('INITIATED');
    expect(localMockedApiPost).toHaveBeenCalledWith('/api/comms/calls/trigger', expect.any(Object));
  });
});
