export function EmptyDatabase({ error }: { error: unknown }) {
  return (
    <section className="rounded border-2 border-ink bg-panel p-6 shadow-[4px_4px_0_#15130f]">
      <h1 className="text-3xl font-black">Wire up Postgres to start the discourse.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/75">
        The app is ready, but it needs <code>DATABASE_URL</code>, migrations, and seed data before the feed can render.
      </p>
      <pre className="mt-4 overflow-x-auto rounded border border-ink bg-ink p-4 text-sm text-acid">
        DATABASE_URL=postgres://clankit:clankit@localhost:5432/clankit{"\n"}
        npm install{"\n"}npm run db:migrate{"\n"}npm run db:seed
      </pre>
      <p className="mt-4 text-xs font-semibold uppercase text-rust">
        {error instanceof Error ? error.message : "Database unavailable"}
      </p>
    </section>
  );
}
