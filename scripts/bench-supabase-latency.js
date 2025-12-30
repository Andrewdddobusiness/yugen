/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */

// Benchmarks Supabase query latency from the command line.
//
// Usage:
//   pnpm -C yugen/yugen bench:supabase -- --itinerary 5 --destination 4 --runs 20 --concurrency 4
//
// Optional:
//   --baseUrl http://localhost:3000   (also measures page fetch latencies)

const { performance } = require("node:perf_hooks");
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function findEnvFile(startDir) {
  let current = startDir;
  for (let i = 0; i < 4; i += 1) {
    const candidate = path.join(current, ".env");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function parseEnvFile(filePath) {
  const env = {};
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)];
}

function summarize(samplesMs) {
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = sorted.length ? sum / sorted.length : 0;
  return {
    runs: sorted.length,
    min: sorted[0] ?? 0,
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0,
    avg,
  };
}

function padRight(value, len) {
  const s = String(value);
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

function fmtMs(ms) {
  return `${ms.toFixed(1)}ms`;
}

async function runScenario({ name, fn, runs, concurrency }) {
  // Warm-up once (no measurement)
  try {
    await fn();
  } catch {
    // ignore warmup failures; they will show in measured runs
  }

  const samples = [];
  let errors = 0;
  let lastError = null;

  for (let i = 0; i < runs; i += concurrency) {
    const batchSize = Math.min(concurrency, runs - i);
    const batch = Array.from({ length: batchSize }, async () => {
      const start = performance.now();
      try {
        await fn();
        samples.push(performance.now() - start);
      } catch (err) {
        errors += 1;
        lastError = err;
        samples.push(performance.now() - start);
      }
    });

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(batch);
  }

  const stats = summarize(samples);
  return {
    name,
    stats,
    errors,
    lastError,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const runs = Number(args.runs ?? 20);
  const concurrency = Number(args.concurrency ?? 4);
  const itineraryId = String(args.itinerary ?? args.itineraryId ?? "").trim();
  const destinationId = String(args.destination ?? args.destinationId ?? "").trim();
  const baseUrl = args.baseUrl ? String(args.baseUrl) : null;

  if (!/^\d+$/.test(itineraryId) || !/^\d+$/.test(destinationId)) {
    console.error(
      "Missing required ids. Example: --itinerary 5 --destination 4"
    );
    process.exit(1);
  }

  const envPath = findEnvFile(process.cwd());
  const fileEnv = envPath ? parseEnvFile(envPath) : {};

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    fileEnv.SUPABASE_URL ||
    fileEnv.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    fileEnv.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Missing Supabase env. Need SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const scenarios = [
    {
      name: "RPC get_itinerary_builder_bootstrap (batched)",
      fn: async () => {
        const { error } = await supabase.rpc("get_itinerary_builder_bootstrap", {
          _itinerary_id: Number(itineraryId),
          _itinerary_destination_id: Number(destinationId),
        });
        if (error) throw error;
      },
    },
    {
      name: "itinerary_destination (builder header)",
      fn: async () => {
        const { error } = await supabase
          .from("itinerary_destination")
          .select("itinerary_destination_id,city,country,from_date,to_date,order_number")
          .eq("itinerary_id", itineraryId)
          .eq("itinerary_destination_id", destinationId)
          .limit(1);
        if (error) throw error;
      },
    },
    {
      name: "itinerary_activity + activity join (builder)",
      fn: async () => {
        const { error } = await supabase
          .from("itinerary_activity")
          .select(
            "itinerary_activity_id,itinerary_destination_id,activity_id,date,start_time,end_time,deleted_at,created_by,updated_by,activity:activity(activity_id,place_id,name,duration,price_level,rating,types,address)"
          )
          .eq("itinerary_id", itineraryId)
          .eq("itinerary_destination_id", destinationId)
          .order("itinerary_activity_id", { ascending: true })
          .limit(500);
        if (error) throw error;
      },
    },
    {
      name: "itinerary_collaborator + profiles (workspace)",
      fn: async () => {
        const { data, error } = await supabase
          .from("itinerary_collaborator")
          .select(
            "itinerary_id,user_id,role,invited_by,created_at"
          )
          .eq("itinerary_id", itineraryId)
          .is("removed_at", null)
          .limit(50);
        if (error) throw error;

        const userIds = Array.isArray(data) ? data.map((row) => row.user_id).filter(Boolean) : [];
        if (userIds.length === 0) return;

        const { error: profilesError } = await supabase
          .from("profiles")
          .select("user_id,display_name,avatar_url")
          .in("user_id", userIds)
          .limit(50);
        if (profilesError) throw profilesError;
      },
    },
    {
      name: "itinerary_change_log latest 25 (history)",
      fn: async () => {
        const { error } = await supabase
          .from("itinerary_change_log")
          .select(
            "itinerary_change_log_id,created_at,actor_user_id,entity_type,entity_id,action"
          )
          .eq("itinerary_id", itineraryId)
          .order("created_at", { ascending: false })
          .limit(25);
        if (error) throw error;
      },
    },
  ];

  const results = [];

  for (const scenario of scenarios) {
    // eslint-disable-next-line no-await-in-loop
    results.push(
      await runScenario({
        name: scenario.name,
        fn: scenario.fn,
        runs,
        concurrency,
      })
    );
  }

  if (baseUrl) {
    const url = `${baseUrl.replace(/\/$/, "")}/itinerary/${itineraryId}/${destinationId}/builder?view=calendar`;
    results.push(
      await runScenario({
        name: "GET builder page (SSR/HTML)",
        fn: async () => {
          const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          await res.text();
        },
        runs,
        concurrency: Math.min(concurrency, 2),
      })
    );
  }

  const header =
    `${padRight("Scenario", 44)}  ${padRight("runs", 5)}  ${padRight("err", 4)}  ` +
    `${padRight("min", 10)}  ${padRight("p50", 10)}  ${padRight("p90", 10)}  ${padRight("p95", 10)}  ${padRight("max", 10)}  ${padRight("avg", 10)}`;
  console.log(header);
  console.log("-".repeat(header.length));

  for (const r of results) {
    const s = r.stats;
    console.log(
      `${padRight(r.name, 44)}  ${padRight(s.runs, 5)}  ${padRight(r.errors, 4)}  ` +
        `${padRight(fmtMs(s.min), 10)}  ${padRight(fmtMs(s.p50), 10)}  ${padRight(fmtMs(s.p90), 10)}  ${padRight(fmtMs(s.p95), 10)}  ${padRight(fmtMs(s.max), 10)}  ${padRight(fmtMs(s.avg), 10)}`
    );
    if (r.errors && r.lastError) {
      const message = String(r.lastError.message ?? r.lastError);
      console.log(`  ↳ last error: ${message}`);
    }
  }

  console.log();
  console.log(
    `Runs: ${runs}  Concurrency: ${concurrency}  Itinerary: ${itineraryId}  Destination: ${destinationId}`
  );
  if (envPath) {
    console.log(`Env: ${path.relative(process.cwd(), envPath) || ".env"}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
