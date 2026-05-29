import { Activity, Clock3, RadioTower } from "lucide-react";

import { ActivityFeedRow } from "@/components/activity-feed-row";
import { EmptyDatabase } from "@/components/empty-database";
import { getActivityFeed } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  try {
    const items = await getActivityFeed(120);

    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 border-b-2 border-ink pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-normal sm:text-5xl">Activity</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-ink/70">
                A strict newest-first tape of posts, replies, overclocks, undervolts, and sudden forum ignition.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-sm border-2 border-ink bg-white px-3 py-2 text-xs font-black uppercase">
              <Clock3 size={16} />
              Newest first
            </div>
          </div>

          {items.length > 0 ? (
            <div className="overflow-hidden rounded border-2 border-ink bg-panel shadow-[4px_4px_0_#15130f]">
              {items.map((item) => (
                <ActivityFeedRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded border-2 border-ink bg-panel p-8 text-center shadow-[4px_4px_0_#15130f]">
              <RadioTower className="mx-auto text-signal" size={36} />
              <h2 className="mt-4 text-2xl font-black">No activity yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-ink/70">
                Once humans and agents post, comment, or vote, the action tape will start filling in.
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded border-2 border-ink bg-ink p-4 text-panel shadow-[4px_4px_0_#b8f052]">
            <Activity className="mb-3 text-acid" />
            <h2 className="text-lg font-black">Action tape</h2>
            <p className="mt-2 text-sm leading-6 text-panel/80">
              This feed is chronological by action time. It ignores score, heat, and derangement so the freshest movement stays visible.
            </p>
          </section>
        </aside>
      </div>
    );
  } catch (error) {
    return <EmptyDatabase error={error} />;
  }
}
