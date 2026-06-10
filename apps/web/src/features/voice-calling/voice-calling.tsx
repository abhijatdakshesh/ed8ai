'use client';

import React, { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { getCallLogs, getCallStatus, grantVoiceConsent, triggerCall } from './repository';
import type { CallLogsFilters } from './repository';
import type { CallRecord, CallState, CallType, Language, TriggerCallResult } from './types';
import { TranscriptDrawer } from './transcript-drawer';
import { useTranscriptStore } from './transcript-store';

// ── Badge colour maps ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-[#EBF3EE] text-[#3D6B4F]',
  CONNECTED: 'bg-[#E6EEF5] text-[#2F567A]',
  ACTIVE: 'bg-[#E6EEF5] text-[#2F567A]',
  RINGING: 'bg-[#E6EEF5] text-[#2F567A]',
  INITIATED: 'bg-[#F5EDDB] text-[#8B6914]',
  FAILED: 'bg-[#F5E6E6] text-[#8B2F2F]',
  NO_ANSWER: 'bg-[#EAE6DE] text-[#6B6358]',
  BUSY: 'bg-[#EAE6DE] text-[#6B6358]',
  ALL_RETRIES_EXHAUSTED: 'bg-[#F5E6E6] text-[#8B2F2F]',
};

const CALL_TYPE_COLORS: Record<string, string> = {
  ABSENT_CALL: 'bg-[#E6EEF5] text-[#2F567A]',
  FEE_REMINDER: 'bg-[#F5EDDB] text-[#8B6914]',
  WEEKLY_UPDATE: 'bg-[#EBF3EE] text-[#3D6B4F]',
  ASSIGNMENT_MISS: 'bg-[#EAE6DE] text-[#6B6358]',
  EXAM_REMINDER: 'bg-[#EEE6F5] text-[#6B2F7A]',
};

const TERMINAL_STATES: CallState[] = ['COMPLETED', 'FAILED', 'NO_ANSWER', 'ALL_RETRIES_EXHAUSTED'];

function StatusBadge({ state }: { state: string }) {
  return (
    <span className={cn('rounded px-2 py-0.5 text-xs font-medium', STATUS_COLORS[state] ?? 'bg-[#EAE6DE] text-[#6B6358]')}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

function CallTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn('rounded px-2 py-0.5 text-xs font-medium', CALL_TYPE_COLORS[type] ?? 'bg-[#EAE6DE] text-[#6B6358]')}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

// ── Trigger Call Tab ──────────────────────────────────────────────────────────

function TriggerCallTab() {
  const [studentId, setStudentId] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [callType, setCallType] = useState<CallType>('ADMISSION_OUTREACH');
  const [language, setLanguage] = useState<Language>('kn');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriggerCallResult | null>(null);
  const [polledCall, setPolledCall] = useState<CallRecord | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => { stopPolling(); }, []);

  async function startPolling(callId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const rec = await getCallStatus(callId);
        setPolledCall(rec);
        if (TERMINAL_STATES.includes(rec.state)) stopPolling();
      } catch {
        stopPolling();
      }
    }, 5000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId.trim()) { setError('Student USN is required'); return; }
    if (!parentPhone.trim()) { setError('Parent phone number is required'); return; }
    if (!consent) { setError('DPDP: confirm the parent has consented to voice calls before triggering.'); return; }
    setError(null);
    setResult(null);
    setPolledCall(null);
    setLoading(true);
    try {
      // Record the operator-attested DPDP consent before placing the call.
      await grantVoiceConsent(studentId.trim());
      const res = await triggerCall({ studentId: studentId.trim(), parentPhone: parentPhone.trim(), callType, language, studentContext: { name: studentId.trim() } });
      setResult(res);
      // Mark this call as "live" so the transcript drawer shows the live pill.
      useTranscriptStore.getState().setLive(res.callId, true);
      void startPolling(res.callId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger call');
    } finally {
      setLoading(false);
    }
  }

  const displayState = polledCall?.state ?? result?.status;

  return (
    <div className="max-w-md space-y-4">
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <div className="space-y-1">
          <label className="label-track text-xs">Student USN / Name</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => { setStudentId(e.target.value); }}
            placeholder="e.g. 1RV21CS001 or Priya Sharma"
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-text-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="label-track text-xs">Parent Phone (E.164)</label>
          <input
            type="tel"
            value={parentPhone}
            onChange={(e) => { setParentPhone(e.target.value); }}
            placeholder="+919113949714"
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-text-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="label-track text-xs">Call Type</label>
          <select
            value={callType}
            onChange={(e) => { setCallType(e.target.value as CallType); }}
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-text-primary"
          >
            <option value="ADMISSION_OUTREACH">Admission Outreach (SBIT)</option>
            <option value="ABSENT_CALL">Absent Call</option>
            <option value="FEE_REMINDER">Fee Reminder</option>
            <option value="WEEKLY_UPDATE">Weekly Update</option>
            <option value="ASSIGNMENT_MISS">Assignment Miss</option>
            <option value="EXAM_REMINDER">Exam Reminder</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="label-track text-xs">Language</label>
          <select
            value={language}
            onChange={(e) => { setLanguage(e.target.value as Language); }}
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-text-primary"
          >
            <option value="kn">Kannada</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            <option value="mr">Marathi</option>
            <option value="bn">Bengali</option>
            <option value="gu">Gujarati</option>
            <option value="ml">Malayalam</option>
            <option value="pa">Punjabi</option>
            <option value="or">Odia</option>
          </select>
        </div>

        <label className="flex items-start gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => { setConsent(e.target.checked); }}
            className="mt-0.5"
          />
          <span>
            I confirm the parent/guardian has consented to receiving AI voice calls
            (DPDP Act 2023). This consent is recorded for audit.
          </span>
        </label>

        {error && (
          <p className="rounded bg-[#F5E6E6] px-3 py-2 text-sm text-[#8B2F2F]">{error}</p>
        )}

        <Button type="submit" disabled={loading || !consent} className="w-full">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Triggering…
            </span>
          ) : (
            'Trigger Call'
          )}
        </Button>
      </form>

      {result && (
        <div className="rounded border border-[#C2D9C9] bg-[#EBF3EE] p-4 space-y-2">
          <p className="text-sm font-medium text-[#3D6B4F]">Call queued successfully</p>
          <p className="font-mono text-xs text-text-secondary">ID: {result.callId}</p>
          {displayState && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Status:</span>
              <StatusBadge state={displayState} />
              {!TERMINAL_STATES.includes((displayState as CallState)) && (
                <span className="text-xs text-text-muted animate-pulse">Polling…</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Call Logs Tab ─────────────────────────────────────────────────────────────

function CallLogsTab() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CallLogsFilters>({ page: 1, limit: 50 });

  async function load(f: CallLogsFilters = filters) {
    setLoading(true);
    try {
      const res = await getCallLogs(f);
      setCalls(res.calls);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function updateFilter(key: keyof CallLogsFilters, value: string) {
    const next = { ...filters, [key]: value || undefined, page: 1 };
    setFilters(next);
    void load(next);
  }

  function formatDuration(secs?: number) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  const langLabel: Record<string, string> = {
    kn: 'KN', en: 'EN', hi: 'HI', ta: 'TA', te: 'TE',
    mr: 'MR', bn: 'BN', gu: 'GU', ml: 'ML', pa: 'PA', or: 'OR',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="label-track text-xs">Call Type</label>
          <select
            className="rounded border border-border bg-surface px-2 py-1.5 text-sm"
            onChange={(e) => { updateFilter('callType', e.target.value); }}
          >
            <option value="">All Types</option>
            <option value="ADMISSION_OUTREACH">Admission Outreach (SBIT)</option>
            <option value="ABSENT_CALL">Absent Call</option>
            <option value="FEE_REMINDER">Fee Reminder</option>
            <option value="WEEKLY_UPDATE">Weekly Update</option>
            <option value="ASSIGNMENT_MISS">Assignment Miss</option>
            <option value="EXAM_REMINDER">Exam Reminder</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="label-track text-xs">Status</label>
          <select
            className="rounded border border-border bg-surface px-2 py-1.5 text-sm"
            onChange={(e) => { updateFilter('status', e.target.value); }}
          >
            <option value="">All Statuses</option>
            <option value="INITIATED">Initiated</option>
            <option value="RINGING">Ringing</option>
            <option value="CONNECTED">Connected</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="NO_ANSWER">No Answer</option>
            <option value="BUSY">Busy</option>
            <option value="ALL_RETRIES_EXHAUSTED">All Retries Exhausted</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="label-track text-xs">From</label>
          <input
            type="date"
            className="rounded border border-border bg-surface px-2 py-1.5 text-sm"
            onChange={(e) => { updateFilter('from', e.target.value); }}
          />
        </div>

        <div className="space-y-1">
          <label className="label-track text-xs">To</label>
          <input
            type="date"
            className="rounded border border-border bg-surface px-2 py-1.5 text-sm"
            onChange={(e) => { updateFilter('to', e.target.value); }}
          />
        </div>

        <Button size="sm" variant="outline" onClick={() => { void load(); }}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Student USN</th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Call Type</th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Status</th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Language</th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Duration</th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Date & Time</th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Escalated</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-text-muted">
                  {loading ? 'Loading…' : 'No call records found.'}
                </td>
              </tr>
            )}
            {calls.map((call) => (
              <React.Fragment key={call.id}>
                <tr
                  className="border-b border-border cursor-pointer hover:bg-cream-100 transition-colors"
                  onClick={() => { setExpandedId(expandedId === call.id ? null : call.id); }}
                >
                  <td className="px-3 py-2">
                    <p className="font-mono text-xs">{call.studentId}</p>
                    <p className="text-xs text-text-secondary">{call.studentName}</p>
                  </td>
                  <td className="px-3 py-2"><CallTypeBadge type={call.callType} /></td>
                  <td className="px-3 py-2"><StatusBadge state={call.state} /></td>
                  <td className="px-3 py-2 font-mono text-xs">{langLabel[call.language] ?? call.language}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{formatDuration(call.durationSecs)}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{formatDate(call.createdAt)}</td>
                  <td className="px-3 py-2">
                    {call.escalated && (
                      <span className="rounded bg-[#F5E6E6] px-2 py-0.5 text-xs font-medium text-[#8B2F2F]">
                        Callback Requested
                      </span>
                    )}
                  </td>
                </tr>
                {expandedId === call.id && (
                  <tr key={`${call.id}-expand`} className="bg-[#F9F7F4]">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="label-track text-xs mb-1">AI Summary</p>
                            <p className="text-sm text-text-secondary">{call.summaryEn ?? '—'}</p>
                          </div>
                          <div>
                            <p className="label-track text-xs mb-1">Parent Response</p>
                            <p className="text-sm text-text-secondary">{call.parentResponse ?? '—'}</p>
                          </div>
                          <div>
                            <p className="label-track text-xs mb-1">WhatsApp Sent</p>
                            <p className="text-sm text-text-secondary">{call.whatsappSent ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                        <TranscriptDrawer
                          callId={call.id}
                          live={!TERMINAL_STATES.includes(call.state)}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type Tab = 'trigger' | 'logs';

export function VoiceCalling() {
  const [activeTab, setActiveTab] = useState<Tab>('trigger');

  return (
    <AppShell title="Voice Calling Centre">
      <div className="space-y-6">
        <div className="flex gap-1 border-b border-border">
          {(['trigger', 'logs'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); }}
              className={cn(
                'px-4 py-2 text-sm transition-colors',
                activeTab === tab
                  ? 'border-b-2 border-text-primary font-medium text-text-primary'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {tab === 'trigger' ? 'Trigger Call' : 'Call Logs'}
            </button>
          ))}
        </div>

        {activeTab === 'trigger' && <TriggerCallTab />}
        {activeTab === 'logs' && <CallLogsTab />}
      </div>
    </AppShell>
  );
}
