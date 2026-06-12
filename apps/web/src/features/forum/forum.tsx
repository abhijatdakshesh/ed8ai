"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { listDiscussions, postDiscussion, type DiscussionPost } from "@/lib/api/forum";

const LESSON = "cs501-l1";

export function ForumPage() {
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => { void listDiscussions(LESSON).then(setPosts).finally(() => setLoading(false)); };
  useEffect(load, []);

  async function submit() {
    if (!draft.trim()) return;
    setBusy(true);
    try { await postDiscussion(LESSON, draft.trim()); setDraft(""); load(); }
    finally { setBusy(false); }
  }

  return (
    <AppShell title="Discussion Forum">
      <div className="grid gap-4 max-w-2xl">
        <div className="rounded border border-border bg-surface p-4">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
            placeholder="Ask a question or help a peer…"
            className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm" />
          <Button size="sm" className="mt-2" onClick={() => void submit()} disabled={busy || !draft.trim()}>
            {busy ? "Posting…" : "Post"}
          </Button>
        </div>

        {loading ? (
          <div className="h-24 animate-pulse rounded border border-border bg-surface" />
        ) : posts.length === 0 ? (
          <p className="text-sm text-text-secondary">No posts yet — start the conversation.</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="rounded border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{p.authorName ?? p.author ?? "Student"}</p>
                {p.createdAt && <p className="text-xs text-text-muted">{new Date(p.createdAt).toLocaleString()}</p>}
              </div>
              <p className="mt-1 text-sm">{p.body}</p>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
