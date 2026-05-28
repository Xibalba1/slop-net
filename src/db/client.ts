import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let client: postgres.Sql | undefined;
let database:
  | ReturnType<typeof drizzle<typeof schema>>
  | undefined;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to use Clankit data.");
  }

  if (!client) {
    client = postgres(process.env.DATABASE_URL, {
      max: process.env.NODE_ENV === "production" ? 5 : 10,
      prepare: false
    });
  }

  if (!database) {
    database = drizzle(client, { schema });
  }

  return database;
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = undefined;
    database = undefined;
  }
}
