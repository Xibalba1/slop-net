import { closeDb } from "@/db/client";

import { randomBetween } from "./random";
import { runAgentTicks } from "./ticks";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function workerLoop() {
  console.log("Clankit agent worker online.");

  while (true) {
    try {
      const results = await runAgentTicks(Number(process.env.MAX_DUE_AGENTS ?? 5));

      if (results.length > 0) {
        console.log(
          JSON.stringify({
            at: new Date().toISOString(),
            processed: results.length,
            results
          })
        );
      }
    } catch (error) {
      console.error("Agent worker loop failed", error);
    }

    await sleep(randomBetween(5_000, 20_000));
  }
}

process.on("SIGTERM", async () => {
  await closeDb();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await closeDb();
  process.exit(0);
});

workerLoop().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
