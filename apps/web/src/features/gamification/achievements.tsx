"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/shell";
import { cn } from "@/lib/utils";
import { getProfile, getLeaderboard, type GamificationProfile, type LeaderboardRow } from "@/lib/api/gamification";

const COURSE = "CS501";

export function AchievementsPage() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProfile(COURSE), getLeaderboard(COURSE)])
      .then(([p, b]) => { setProfile(p); setBoard(b); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Achievements">
      {loading ? (
        <div className="h-40 animate-pulse rounded border border-border bg-surface" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-5">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Points", value: profile?.points ?? 0 },
                { label: "Day Streak", value: `${profile?.streak ?? 0} 🔥` },
                { label: "Badges", value: `${profile?.earnedCount ?? 0}/${profile?.badges.length ?? 0}` },
              ].map((s) => (
                <div key={s.label} className="rounded border border-border bg-surface p-4">
                  <p className="label-track">{s.label}</p>
                  <p className="mt-1 text-3xl font-light">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded border border-border bg-surface p-5">
              <p className="label-track mb-3">Badges</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {profile?.badges.map((b) => (
                  <div key={b.code} className={cn("rounded border p-3 text-center", b.earned ? "border-[#C2D9C9] bg-[#EBF3EE]" : "border-border bg-cream-50 opacity-50")}>
                    <div className="text-3xl">{b.icon}</div>
                    <p className="mt-1 text-sm font-medium">{b.title}</p>
                    <p className="text-xs text-text-muted">{b.description}</p>
                    {b.earned && <p className="mt-1 text-xs text-[#3D6B4F]">Earned</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded border border-border bg-surface p-5 self-start">
            <p className="label-track mb-3">Class Leaderboard</p>
            <ol className="grid gap-1">
              {board.map((r) => (
                <li key={r.usn} className={cn("flex items-center justify-between rounded px-3 py-2 text-sm", r.isMe ? "bg-[#1C1810] text-[#F2EFE9]" : "bg-cream-100")}>
                  <span className="flex items-center gap-2">
                    <span className="w-6 text-center font-medium">{r.rank <= 3 ? ["🥇","🥈","🥉"][r.rank - 1] : r.rank}</span>
                    <span>{r.name}</span>
                  </span>
                  <span className="font-medium">{r.points}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </AppShell>
  );
}
