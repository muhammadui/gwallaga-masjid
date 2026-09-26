import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations must run over Neon's DIRECT (unpooled) connection: the "-pooler"
// (PgBouncer, transaction mode) endpoint breaks Prisma's session-level advisory
// lock, so `migrate` times out with P1002. We strip "-pooler" for the CLI; the
// runtime client (src/lib/db.ts) keeps the pooled DATABASE_URL. DIRECT_URL
// overrides when set.
const rawUrl =
  process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]?.replace("-pooler", "");

// Neon computes scale to zero; a cold start can take several seconds, longer
// than the schema engine's default connect timeout (P1001). Give it room.
function withConnectTimeout(url: string | undefined) {
  if (!url || /[?&]connect_timeout=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connect_timeout=30`;
}
const migrateUrl = withConnectTimeout(rawUrl);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrateUrl,
  },
});
