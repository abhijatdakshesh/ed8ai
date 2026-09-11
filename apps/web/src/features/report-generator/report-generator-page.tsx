'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/shell';
import type { ReportType, ReportParams, ReportGeneration } from './types';
import { REPORT_PRESETS, DEPARTMENTS, TEST_CHOICES, generateReport, getHistory } from './repository';

export function ReportGeneratorPage() {
  const [selectedType, setSelectedType] = useState<ReportType>('ATTENDANCE');
  const [params, setParams] = useState<ReportParams>({ semester: 5, testChoice: 'CIE-1' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ReportGeneration[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      setHistory(await getHistory());
    } catch {
      // silent — history is non-critical
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      // Filename comes from the server's Content-Disposition. It used to be
      // hardcoded to .zip while the backend emits .xlsx, so every download
      // arrived as an archive macOS refused to open.
      const { blob, filename } = await generateReport(selectedType, params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setLoading(false);
    }
  }

  const preset = REPORT_PRESETS.find(p => p.type === selectedType)!;

  return (
    <AppShell title="Report Generator">
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 h-full">
        {/* Preset selector */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Report Type</p>
          {REPORT_PRESETS.map(p => (
            <button
              key={p.type}
              onClick={() => setSelectedType(p.type)}
              className={`text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                selectedType === p.type
                  ? 'bg-amber-50 border border-amber-300 text-amber-900 font-medium'
                  : 'hover:bg-stone-100 text-stone-700 border border-transparent'
              }`}
            >
              <div className="font-medium">{p.label}</div>
              <div className="text-xs text-stone-500 mt-0.5 line-clamp-2">{p.description}</div>
            </button>
          ))}
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-stone-800 mb-1">{preset.label}</h2>
            <p className="text-sm text-stone-500 mb-4">{preset.description}</p>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Department</label>
                <select
                  value={params.department ?? ''}
                  onChange={e => setParams(p => ({ ...p, department: e.target.value || undefined } as ReportParams))}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Semester</label>
                <select
                  value={params.semester ?? ''}
                  onChange={e => setParams(p => ({ ...p, semester: Number(e.target.value) || undefined } as ReportParams))}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Section</label>
                <input
                  type="text"
                  placeholder="e.g. A"
                  value={params.section ?? ''}
                  onChange={e => setParams(p => ({ ...p, section: e.target.value || undefined } as ReportParams))}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2"
                />
              </div>

              {selectedType === 'ATTENDANCE' || selectedType === 'MARKS' ? (
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Test</label>
                  <select
                    value={params.testChoice ?? 'CIE-1'}
                    onChange={e => setParams(p => ({ ...p, testChoice: e.target.value }))}
                    className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {TEST_CHOICES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              ) : null}

              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-600 mb-1">Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Attendance up to 17th March 2025"
                  value={params.note ?? ''}
                  onChange={e => setParams(p => ({ ...p, note: e.target.value || undefined } as ReportParams))}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            {error && (
              <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-5 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {/* The engine emits .xlsx, not PDF — the old label was wrong. */}
              {loading ? 'Generating…' : 'Generate & Download Report'}
            </button>
          </div>

          {/* History */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex-1 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-700 text-sm">Generation History</h3>
              <button onClick={loadHistory} className="text-xs text-stone-400 hover:text-stone-600">Refresh</button>
            </div>

            {histLoading ? (
              <p className="text-sm text-stone-400">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-stone-400">No reports generated yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-stone-500 border-b border-stone-100">
                    <th className="text-left pb-2 font-medium">Type</th>
                    <th className="text-left pb-2 font-medium">Parameters</th>
                    <th className="text-left pb-2 font-medium">Status</th>
                    <th className="text-left pb-2 font-medium">Size</th>
                    <th className="text-left pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-b border-stone-50 hover:bg-stone-50">
                      <td className="py-2 pr-3 font-medium text-stone-700">{h.reportType}</td>
                      <td className="py-2 pr-3 text-stone-500 text-xs">
                        {h.parameters ? `${h.parameters.department ?? 'All'} · Sem ${h.parameters.semester ?? 'All'} · ${h.parameters.testChoice ?? ''}` : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          h.status === 'DONE' ? 'bg-green-50 text-green-700' :
                          h.status === 'FAILED' ? 'bg-red-50 text-red-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>{h.status}</span>
                      </td>
                      <td className="py-2 pr-3 text-stone-500 text-xs">
                        {h.pdfSizeBytes ? `${(h.pdfSizeBytes / 1024).toFixed(1)} KB` : '—'}
                      </td>
                      <td className="py-2 text-stone-400 text-xs">
                        {new Date(h.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
