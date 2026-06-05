// Server-side page-metadata fetcher for the Link Dump tool. Fetches a page
// server-side (to dodge CORS / bot walls) and extracts a title + short summary.
// Ported verbatim in behavior from the standalone link-dump's serverless
// function: HTTP 200 even when extraction is a no-op (a failed fetch must never
// block a save), 400 only for a missing/invalid url.
import { parse } from "node-html-parser";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 6000;
const SUMMARY_MAX_CHARS = 280;
// A real-ish desktop UA helps a few sites return full HTML instead of a bot wall.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Collapse whitespace and clamp. Returns null for empty input so callers can
// treat "" and missing the same way.
function clean(text: string | null | undefined, max = Infinity): string | null {
  if (!text) return null;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.length > max
    ? normalized.slice(0, max - 1).trimEnd() + "…"
    : normalized;
}

type Root = ReturnType<typeof parse>;

function metaContent(root: Root, selector: string): string | null {
  return root.querySelector(selector)?.getAttribute("content") ?? null;
}

// Pure parsing step.
export function extractMetadata(html: string): {
  title: string | null;
  summary: string | null;
} {
  const root = parse(html);

  const title =
    clean(metaContent(root, 'meta[property="og:title"]')) ||
    clean(metaContent(root, 'meta[name="og:title"]')) ||
    clean(root.querySelector("title")?.text);

  let summary =
    clean(metaContent(root, 'meta[property="og:description"]'), SUMMARY_MAX_CHARS) ||
    clean(metaContent(root, 'meta[name="description"]'), SUMMARY_MAX_CHARS);

  if (!summary) {
    // Fall back to the first paragraph that actually has prose in it.
    for (const p of root.querySelectorAll("p")) {
      const candidate = clean(p.text, SUMMARY_MAX_CHARS);
      if (candidate && candidate.length >= 20) {
        summary = candidate;
        break;
      }
    }
  }

  return { title: title ?? null, summary: summary ?? null };
}

// Single timed fetch helper, used for both page HTML and oEmbed JSON.
async function timedFetch(target: string | URL, accept: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: accept },
    });
  } finally {
    clearTimeout(timer);
  }
}

// oEmbed providers that need no API key. We only take the title — no thumbnail
// or summary, by request (the user writes their own note).
const OEMBED_PROVIDERS = [
  {
    match: (host: string) => /(^|\.)tiktok\.com$/.test(host),
    endpoint: (u: string) =>
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
    fallback: "TikTok video",
  },
];

// Readable label for hosts we can't reliably fetch (e.g. Instagram needs a token).
function socialLabel(host: string, pathname: string): string | null {
  if (/(^|\.)instagram\.com$/.test(host)) {
    if (pathname.includes("/reel")) return "Instagram reel";
    if (pathname.includes("/p/")) return "Instagram post";
    if (pathname.includes("/tv/")) return "Instagram video";
    return "Instagram";
  }
  return null;
}

async function tryOEmbedTitle(
  provider: (typeof OEMBED_PROVIDERS)[number],
  rawUrl: string,
): Promise<string | null> {
  try {
    const res = await timedFetch(provider.endpoint(rawUrl), "application/json");
    if (!res.ok) return null;
    const data = await res.json();
    return clean(data.title, 200) || clean(data.author_name);
  } catch {
    return null;
  }
}

type FetchResult =
  | { ok: false; reason: string }
  | { ok: true; fetched: boolean; title: string | null; summary: string | null };

// Always resolves; never throws. On any failure it returns nulls so the caller
// can still save the link with just the user's note.
async function tryFetchMetadata(rawUrl: string): Promise<FetchResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid-url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "unsupported-protocol" };
  }

  // 1. Known oEmbed provider (TikTok): title only, no summary.
  const provider = OEMBED_PROVIDERS.find((p) => p.match(url.hostname));
  if (provider) {
    const title = await tryOEmbedTitle(provider, rawUrl);
    return {
      ok: true,
      fetched: Boolean(title),
      title: title ?? provider.fallback,
      summary: null,
    };
  }

  // 2. Generic page: fetch HTML and extract title + first paragraph.
  try {
    const res = await timedFetch(url, "text/html,application/xhtml+xml");
    const contentType = res.headers.get("content-type") || "";
    if (
      res.ok &&
      (contentType.includes("text/html") ||
        contentType.includes("application/xhtml"))
    ) {
      const { title, summary } = extractMetadata(await res.text());
      if (title || summary) return { ok: true, fetched: true, title, summary };
    }
  } catch {
    // AbortError (timeout), DNS failure, TLS error, etc. — swallowed.
  }

  // 3. Nothing extracted — give known socials (Instagram) a readable label,
  //    otherwise clean failure (saves with the note only).
  const label = socialLabel(url.hostname, url.pathname);
  return { ok: true, fetched: Boolean(label), title: label, summary: null };
}

export async function GET(req: Request) {
  const rawUrl = new URL(req.url).searchParams.get("url");
  if (!rawUrl) {
    return Response.json(
      { error: "Missing ?url query parameter" },
      { status: 400 },
    );
  }

  const result = await tryFetchMetadata(rawUrl);
  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: 400 });
  }

  // 200 even when the fetch was a no-op: a failed fetch must never block a save.
  return Response.json({
    title: result.title ?? null,
    summary: result.summary ?? null,
    fetched: result.fetched ?? false,
  });
}
