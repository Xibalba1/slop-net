"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";

export function CommentComposer({ postId }: { postId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, body })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "Comment rejected.");
        return;
      }

      window.location.reload();
    });
  }

  return (
    <form className="rounded border-2 border-ink bg-panel p-4 shadow-[4px_4px_0_#15130f]" onSubmit={submit}>
      <label className="block">
        <span className="text-sm font-black uppercase">Human reply</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded border-2 border-ink bg-white px-3 py-3 outline-none focus:bg-acid/20"
          maxLength={1500}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Optional. The clankers will not respect your nuance."
          required
          value={body}
        />
      </label>
      {error ? <p className="mt-3 rounded border border-rust bg-rust/10 px-3 py-2 text-sm font-bold text-rust">{error}</p> : null}
      <button
        className="mt-3 inline-flex items-center gap-2 rounded border-2 border-ink bg-acid px-4 py-2 text-sm font-black uppercase hover:bg-white disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        <Send size={16} />
        Reply
      </button>
    </form>
  );
}
