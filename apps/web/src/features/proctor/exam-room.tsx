"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { proctorApi, type Assessment, type AttemptResult, type FlagType } from "@/lib/api/proctor";

const ASSESSMENT_ID = "as-cs501-1";
type Phase = "intro" | "running" | "done";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ExamRoom() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attemptId, setAttemptId] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const flagCount = useRef(0);
  const [flagNote, setFlagNote] = useState<string | null>(null);
  const submitting = useRef(false);

  useEffect(() => { void proctorApi.getAssessment(ASSESSMENT_ID).then(setAssessment); }, []);

  // Proctor event wiring (only while running).
  useEffect(() => {
    if (phase !== "running") return;
    const raise = (type: FlagType, msg: string) => {
      flagCount.current += 1;
      setFlagNote(`⚠ ${msg} recorded (${flagCount.current})`);
      void proctorApi.flag(attemptId, type);
    };
    const onVis = () => { if (document.hidden) raise("TAB_SWITCH", "Tab switch"); };
    const onBlur = () => raise("FOCUS_LOSS", "Window focus lost");
    const onCopy = () => raise("COPY_PASTE", "Copy/paste");
    const onFs = () => { if (!document.fullscreenElement) raise("FULLSCREEN_EXIT", "Exited fullscreen"); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onCopy);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onCopy);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [phase, attemptId]);

  // Countdown.
  useEffect(() => {
    if (phase !== "running") return;
    if (remaining <= 0) { void doSubmit(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, remaining]);

  async function start() {
    if (!assessment) return;
    const att = await proctorApi.start(assessment.id);
    setAttemptId(att.id);
    setRemaining(assessment.durationSec);
    flagCount.current = 0;
    try { await document.documentElement.requestFullscreen?.(); } catch { /* ignore */ }
    setPhase("running");
  }

  async function doSubmit() {
    if (submitting.current) return;
    submitting.current = true;
    const res = await proctorApi.submit(attemptId, answers, flagCount.current);
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* ignore */ } }
    setResult(res);
    setPhase("done");
  }

  return (
    <AppShell title="Proctored Exam">
      {phase === "intro" && assessment && (
        <div className="max-w-lg rounded border border-border bg-surface p-6">
          <h3 className="text-xl">{assessment.title}</h3>
          <p className="mt-2 text-sm text-text-secondary">{assessment.questions.length} questions · {Math.round(assessment.durationSec / 60)} min</p>
          <div className="mt-4 rounded bg-[#FDF9F0] border-l-4 border-l-[#8B6914] p-3 text-sm">
            Proctored: stay in fullscreen, don’t switch tabs or copy/paste. Violations are recorded and lower your integrity score.
          </div>
          <Button className="mt-4" onClick={() => void start()}>Start Exam (Fullscreen)</Button>
        </div>
      )}

      {phase === "running" && assessment && (
        <div className="grid gap-4 max-w-2xl">
          <div className="sticky top-2 z-10 flex items-center justify-between rounded border border-border bg-surface px-4 py-2">
            <span className="text-sm text-text-secondary">{Object.keys(answers).length}/{assessment.questions.length} answered</span>
            <span className={cn("font-mono text-lg", remaining < 60 && "text-[#8B2F2F]")}>{fmt(remaining)}</span>
          </div>
          {flagNote && <p className="rounded bg-[#F5E6E6] px-3 py-1 text-xs text-[#8B2F2F]">{flagNote}</p>}
          {assessment.questions.map((q, i) => (
            <div key={q.id} className="rounded border border-border bg-surface p-4">
              <p className="font-medium text-sm">{i + 1}. {q.q}</p>
              <div className="mt-2 grid gap-1">
                {q.options.map((opt, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-sm">
                    <input type="radio" name={q.id} checked={answers[q.id] === idx} onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <Button onClick={() => void doSubmit()}>Submit Exam</Button>
        </div>
      )}

      {phase === "done" && result && (
        <div className="max-w-md rounded border border-border bg-surface p-6 text-center">
          <p className="label-track">Result</p>
          <p className="mt-2 text-5xl font-light">{result.score}%</p>
          <p className="mt-3 text-sm">Integrity score: <span className={cn("font-medium", (result.integrityScore ?? 100) < 70 ? "text-[#8B2F2F]" : "text-[#3D6B4F]")}>{result.integrityScore}</span></p>
          {result.flagged && <p className="mt-1 text-sm text-[#8B2F2F]">⚠ Flagged for review (proctoring violations)</p>}
        </div>
      )}
    </AppShell>
  );
}
