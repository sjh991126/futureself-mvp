/* Trippy web server
 *
 *   1. Serves the static web app (../web)
 *   2. Claude-powered recommendation APIs (TrippyAI):
 *        POST /api/ai/triplist   — generate a day-by-day TripList
 *        POST /api/ai/spots      — instant TrippySpot recommendations
 *   3. Daily trending rankings (Top 50, cached per day):
 *        GET  /api/trending/categories
 *        GET  /api/trending/triplists
 *   4. CORS proxy to the Trippy backend (signup/login/posts work in browsers
 *      without backend CORS changes):
 *        ANY  /backend/*  →  ${TRIPPY_API_BASE}/*
 *
 * Env: ANTHROPIC_API_KEY (required for live AI), TRIPPY_API_BASE, PORT
 */
import express from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(__dirname, "..", "web");
const CACHE_FILE = path.join(__dirname, "trending-cache.json");
const PORT = process.env.PORT || 3000;
const TRIPPY_API_BASE = (process.env.TRIPPY_API_BASE || "https://api.trippy.global").replace(/\/$/, "");
const MODEL = process.env.TRIPPY_AI_MODEL || "claude-opus-4-8";

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const app = express();
app.use(express.json({ limit: "1mb" }));

/* ── Claude helpers ─────────────────────────────────────────── */

async function claudeJSON({ system, prompt, schema, maxTokens = 16000 }) {
  if (!anthropic) {
    const err = new Error("ANTHROPIC_API_KEY is not set");
    err.status = 503;
    throw err;
  }
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: { type: "json_schema", schema } },
  });
  const message = await stream.finalMessage();
  const text = message.content.find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(text);
}

const PLACE_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    sub: { type: "string", description: "One-line description: type of place · area · why it fits" },
    time: { type: "string", description: "Suggested time, e.g. '10:30 AM'" },
  },
  required: ["name", "sub", "time"],
  additionalProperties: false,
};

const TRIPLIST_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Catchy TripList title with one fitting emoji" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "e.g. 'Day 1: May 11'" },
          places: { type: "array", items: PLACE_SCHEMA },
        },
        required: ["label", "places"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "days"],
  additionalProperties: false,
};

const SPOTS_SCHEMA = {
  type: "object",
  properties: {
    spots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          cat: { type: "string", description: "Venue type, e.g. 'Cocktail Bar'" },
          status: { type: "string", enum: ["open", "busy"] },
          statusText: { type: "string", enum: ["Open now", "Busy"] },
          mins: { type: "integer", description: "Minutes away by car" },
          tags: { type: "array", items: { type: "string" }, description: "Exactly 3 short tags" },
          hot: { type: "boolean", description: "true only for the single best pick" },
        },
        required: ["name", "cat", "status", "statusText", "mins", "tags", "hot"],
        additionalProperties: false,
      },
    },
  },
  required: ["spots"],
  additionalProperties: false,
};

const RANKING_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          area: { type: "string", description: "Neighbourhood / district" },
          blurb: { type: "string", description: "One short line on why it's trending" },
          trend: { type: "string", enum: ["up", "down", "same", "new"] },
          score: { type: "integer", description: "Trend score 0-100" },
        },
        required: ["name", "area", "blurb", "trend", "score"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const SYSTEM = `You are TrippyAI, the recommendation engine of Trippy — a travel app for discovering
local activities, planning TripLists and finding instant nearby spots. Default city is Hong Kong
unless another destination is given. Recommend real, currently-operating places locals love,
with realistic neighbourhoods and timing. Keep every text field short and punchy.`;

/* ── AI endpoints ───────────────────────────────────────────── */

app.post("/api/ai/triplist", async (req, res) => {
  const { destination = "Hong Kong", category = "Nature", groupSize = "Solo", dates = "", days = 1 } = req.body || {};
  try {
    const data = await claudeJSON({
      system: SYSTEM,
      prompt: `Create a TripList.
Destination: ${destination}
Theme/category: ${category}
Group: ${groupSize}
Dates: ${dates || "flexible"}
Days: ${Math.min(Number(days) || 1, 5)}
Give 3-4 places per day in a sensible geographic order.`,
      schema: TRIPLIST_SCHEMA,
    });
    res.json(data);
  } catch (e) {
    res.status(e.status || 502).json({ error: String(e.message || e) });
  }
});

app.post("/api/ai/spots", async (req, res) => {
  const { theme = "After Work", location = "Tsim Sha Tsui, Hong Kong", exclude = [] } = req.body || {};
  try {
    const data = await claudeJSON({
      system: SYSTEM,
      prompt: `Recommend exactly 3 instant TrippySpots near ${location} for the theme "${theme}".
It is right now — prefer places open at this hour. Exactly one spot has hot=true.
${exclude.length ? `Do not repeat: ${exclude.join(", ")}` : ""}`,
      schema: SPOTS_SCHEMA,
      maxTokens: 4000,
    });
    res.json(data);
  } catch (e) {
    res.status(e.status || 502).json({ error: String(e.message || e) });
  }
});

/* ── Daily trending Top 50 (cached per day) ─────────────────── */

async function readCache() {
  try {
    return JSON.parse(await fs.readFile(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function getTrending(kind) {
  const today = new Date().toISOString().slice(0, 10);
  const cache = await readCache();
  if (cache[kind]?.date === today && cache[kind].items?.length) return cache[kind];

  const subject =
    kind === "categories"
      ? "activity categories / themes for things to do in Hong Kong (e.g. Rooftop Bars, Harbour Hikes, Dim Sum Crawls, Night Markets...)"
      : "ready-made TripList ideas for Hong Kong (e.g. 'Golden Hour at West Kowloon', 'Sai Kung Island Hop'...)";

  const data = await claudeJSON({
    system: SYSTEM,
    prompt: `Generate today's (${today}) Top 50 trending ${subject}.
Rank 1 = hottest today. Mix evergreen favourites with seasonal/now items (weather, festivals, openings).
Return exactly 50 items, best first.`,
    schema: RANKING_SCHEMA,
    maxTokens: 30000,
  });

  const entry = { date: today, items: data.items.slice(0, 50) };
  const next = { ...cache, [kind]: entry };
  await fs.writeFile(CACHE_FILE, JSON.stringify(next, null, 1)).catch(() => {});
  return entry;
}

app.get("/api/trending/:kind(categories|triplists)", async (req, res) => {
  try {
    res.json(await getTrending(req.params.kind));
  } catch (e) {
    res.status(e.status || 502).json({ error: String(e.message || e) });
  }
});

/* ── CORS proxy to the Trippy backend ───────────────────────── */

app.all("/backend/*", async (req, res) => {
  const target = TRIPPY_API_BASE + req.originalUrl.replace(/^\/backend/, "");
  try {
    const headers = { "Content-Type": req.headers["content-type"] || "application/json" };
    for (const h of ["authorization", "refresh-token"]) {
      if (req.headers[h]) headers[h] = req.headers[h];
    }
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
      signal: AbortSignal.timeout(15000),
    });
    for (const h of ["authorization", "refresh-token", "content-type"]) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.setHeader("Access-Control-Expose-Headers", "Authorization, Refresh-Token");
    res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ error: `Backend unreachable: ${e.message}` });
  }
});

/* ── Static web app ─────────────────────────────────────────── */

app.use(express.static(WEB_DIR));
app.get("/healthz", (_req, res) =>
  res.json({ ok: true, ai: !!anthropic, model: MODEL, backend: TRIPPY_API_BASE }));

app.listen(PORT, () => {
  console.log(`Trippy web        → http://localhost:${PORT}`);
  console.log(`TrippyAI (Claude) → ${anthropic ? "ON · " + MODEL : "OFF (set ANTHROPIC_API_KEY)"}`);
  console.log(`Backend proxy     → ${TRIPPY_API_BASE}`);
});
