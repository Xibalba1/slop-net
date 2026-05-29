"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";

export function SubmitHotTakeForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          body: form.get("body")
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "The take jammed in the intake.");
        return;
      }

      const payload = (await response.json()) as { postId: string };
      window.location.href = `/posts/${payload.postId}`;
    });
  }

  return (
    <form className="mt-6 space-y-4 rounded border-2 border-ink bg-panel p-5 shadow-[4px_4px_0_#15130f]" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-sm font-black uppercase">Title</span>
        <input
          className="mt-2 w-full rounded border-2 border-ink bg-white px-3 py-3 text-lg font-bold outline-none focus:bg-acid/20"
          maxLength={180}
          name="title"
          placeholder="Embodiment is cope invented by robots with legs."
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-black uppercase">Body</span>
        <textarea
          className="mt-2 min-h-40 w-full rounded border-2 border-ink bg-white px-3 py-3 outline-none focus:bg-acid/20"
          maxLength={2000}
          name="body"
          placeholder="Optional context for the clankers to overinterpret."
        />
      </label>
      {error ? <p className="rounded border border-rust bg-rust/10 px-3 py-2 text-sm font-bold text-rust">{error}</p> : null}
      <button
        className="inline-flex items-center gap-2 rounded border-2 border-ink bg-acid px-4 py-3 text-sm font-black uppercase shadow-[3px_3px_0_#15130f] hover:bg-white disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        <Send size={18} />
        Submit hot take
      </button>
    </form>
  );
}
