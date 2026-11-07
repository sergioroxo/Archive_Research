export const automaticArchiveIds = [
  "wayback",
  "arquivo-pt",
  "common-crawl",
] as const;
export type AutomaticArchiveId = (typeof automaticArchiveIds)[number];
export type Availability = {
  status: "checking" | "found" | "not-found" | "error";
  message: string;
  snapshotUrl?: string;
  timestamp?: string;
  checkedAt?: string;
  queriedUrl?: string;
  attemptedUrls?: string[];
  evidenceType?: "web-page" | "watch-page" | "crawl-record";
  recordUrl?: string;
  scope?: string;
  checkedIndexes?: string[];
  failedIndexes?: string[];
};

// Only link to replay URLs on the archive's own host, even if an API is compromised.
function replayUrl(value: unknown, host: string): string {
  if (typeof value !== "string") throw new Error("Invalid snapshot URL");
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.hostname !== host ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error("Invalid snapshot URL");
  }
  url.protocol = "https:";
  return url.href;
}

const cache = new Map<string, { expires: number; result: Availability }>();

// A missing short-link snapshot does not imply the canonical watch page is missing.
export async function checkTargetAvailability(
  archive: AutomaticArchiveId,
  variants: string[],
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<Availability> {
  if (archive === "common-crawl")
    return checkCommonCrawl(variants[0], signal, fetcher);
  const attemptedUrls: string[] = [];
  let failure: Availability | undefined;
  let last: Availability | undefined;
  for (const url of [...new Set(variants)].slice(0, 4)) {
    if (signal?.aborted)
      return { status: "error", message: "Check cancelled.", attemptedUrls };
    attemptedUrls.push(url);
    const key = `${archive}:${url}`;
    const cached = fetcher === fetch ? cache.get(key) : undefined;
    const result =
      cached && cached.expires > Date.now()
        ? cached.result
        : await checkAvailability(archive, url, signal, fetcher);
    if (fetcher === fetch && ["found", "not-found"].includes(result.status))
      cache.set(key, { expires: Date.now() + 300000, result });
    last = {
      ...result,
      queriedUrl: url,
      attemptedUrls: [...attemptedUrls],
      evidenceType: /youtube\.com|youtu\.be/.test(new URL(url).hostname)
        ? "watch-page"
        : "web-page",
    };
    if (result.status === "found") return last;
    if (result.status === "error") {
      failure = last;
      // Do not multiply requests when a provider is rate limiting or unreachable.
      break;
    }
  }
  return (
    failure ||
    last || { status: "error", message: "No valid URL was available to check." }
  );
}

export async function checkAvailability(
  archive: AutomaticArchiveId,
  targetUrl: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
  timeoutMs = 20000,
): Promise<Availability> {
  if (archive === "common-crawl")
    return checkCommonCrawl(targetUrl, signal, fetcher);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, timeoutMs);
  const checkedAt = new Date().toISOString();
  try {
    const target = new URL(targetUrl);
    if (!["http:", "https:"].includes(target.protocol))
      throw new Error("Invalid target URL");
    target.hash = "";
    const endpoint =
      archive === "wayback"
        ? new URL("https://archive.org/wayback/available")
        : new URL("https://arquivo.pt/textsearch");
    endpoint.searchParams.set(
      archive === "wayback" ? "url" : "versionHistory",
      target.href,
    );
    if (archive === "arquivo-pt") endpoint.searchParams.set("maxItems", "1");
    const response = await fetcher(endpoint.href, {
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) {
      return {
        status: "error",
        checkedAt,
        message:
          response.status === 429
            ? "Rate limit reached. Try again later."
            : `Archive service returned HTTP ${response.status}. Try again.`,
      };
    }
    const data = await response.json();
    if (archive === "wayback") {
      if (
        !data ||
        typeof data.archived_snapshots !== "object" ||
        data.archived_snapshots === null ||
        Array.isArray(data.archived_snapshots)
      )
        throw new Error("Unexpected response");
      const closest = data.archived_snapshots.closest;
      if (!closest || closest.available === false)
        return {
          status: "not-found",
          checkedAt,
          message: "No available snapshot returned for this URL.",
        };
      if (closest.available !== true || String(closest.status) !== "200")
        throw new Error("Unexpected snapshot");
      return {
        status: "found",
        checkedAt,
        message: "Snapshot found",
        snapshotUrl: replayUrl(closest.url, "web.archive.org"),
        timestamp: closest.timestamp,
      };
    }
    if (!data || !Array.isArray(data.response_items))
      throw new Error("Unexpected response");
    if (data.response_items.length === 0)
      return {
        status: "not-found",
        checkedAt,
        message: "No snapshot returned for this URL.",
      };
    const item = data.response_items[0];
    return {
      status: "found",
      checkedAt,
      message: "Snapshot found",
      snapshotUrl: replayUrl(item.linkToArchive, "arquivo.pt"),
      timestamp: item.tstamp,
    };
  } catch {
    return {
      status: "error",
      checkedAt,
      message: controller.signal.aborted
        ? "Check timed out or was cancelled. Try again."
        : "Could not check: network, browser restrictions, or unexpected archive response. Try again or search manually.",
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

type CrawlIndex = { id: string };
let crawlCatalogue: { expires: number; indexes: CrawlIndex[] } | undefined;
let crawlQueue: Promise<void> = Promise.resolve();
let crawlCooldownUntil = 0;

function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Error("Cancelled"));
    const abort = () => {
      clearTimeout(timer);
      reject(new Error("Cancelled"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

// Serial requests and a short pause respect Common Crawl's published API guidance.
export function checkCommonCrawl(
  targetUrl: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
  timeoutMs = 30000,
): Promise<Availability> {
  const run = () => commonCrawlLookup(targetUrl, signal, fetcher, timeoutMs);
  if (fetcher !== fetch) return run();
  const pending = crawlQueue.then(run, run);
  crawlQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

async function commonCrawlLookup(
  targetUrl: string,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<Availability> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, timeoutMs);
  const checkedAt = new Date().toISOString();
  const checkedIndexes: string[] = [];
  const failedIndexes: string[] = [];
  const base = {
    checkedAt,
    checkedIndexes,
    failedIndexes,
    evidenceType: "crawl-record" as const,
    scope: "Up to 3 most recent Common Crawl indexes; not the full archive.",
  };
  try {
    if (controller.signal.aborted) throw new Error("Cancelled");
    const target = new URL(targetUrl);
    if (
      !["http:", "https:"].includes(target.protocol) ||
      target.username ||
      target.password
    )
      throw new Error("Invalid URL");
    target.hash = "";
    const key = `common-crawl:${target.href}`;
    const cached = fetcher === fetch ? cache.get(key) : undefined;
    if (cached && cached.expires > Date.now()) return cached.result;
    if (fetcher === fetch && Date.now() < crawlCooldownUntil)
      throw new Error(
        "Service cooldown after rate limiting. Wait at least a minute before retrying",
      );

    const options = {
      signal: controller.signal,
      credentials: "omit" as const,
      referrerPolicy: "no-referrer" as const,
    };
    let indexes =
      fetcher === fetch && crawlCatalogue && crawlCatalogue.expires > Date.now()
        ? crawlCatalogue.indexes
        : undefined;
    if (!indexes) {
      const catalogueResponse = await fetcher(
        "https://index.commoncrawl.org/collinfo.json",
        options,
      );
      if (!catalogueResponse.ok) {
        if (fetcher === fetch && [429, 503].includes(catalogueResponse.status))
          crawlCooldownUntil = Date.now() + 60000;
        throw new Error(`Catalogue HTTP ${catalogueResponse.status}`);
      }
      const catalogue = await catalogueResponse.json();
      if (!Array.isArray(catalogue)) throw new Error("Invalid catalogue");
      indexes = catalogue
        .filter(
          (item): item is CrawlIndex =>
            item &&
            typeof item.id === "string" &&
            /^CC-MAIN-\d{4}-\d{2}$/.test(item.id),
        )
        .sort((a, b) => b.id.localeCompare(a.id))
        .slice(0, 3);
      if (indexes.length === 0) throw new Error("No valid crawl indexes");
      if (fetcher === fetch)
        crawlCatalogue = { expires: Date.now() + 3600000, indexes };
    }
    for (const index of indexes) {
      if (fetcher === fetch) await pause(1200, controller.signal);
      const endpoint = new URL(
        `https://index.commoncrawl.org/${index.id}-index`,
      );
      endpoint.searchParams.set("url", target.href);
      endpoint.searchParams.set("matchType", "exact");
      endpoint.searchParams.set("output", "json");
      endpoint.searchParams.set("limit", "1");
      endpoint.searchParams.set("filter", "=status:200");
      const perIndex = new AbortController();
      const abortIndex = () => perIndex.abort();
      controller.signal.addEventListener("abort", abortIndex, { once: true });
      const indexTimeout = setTimeout(abortIndex, 8000);
      let response: Response;
      let text: string;
      try {
        if (controller.signal.aborted) throw new Error("Cancelled");
        response = await fetcher(endpoint.href, {
          ...options,
          signal: perIndex.signal,
        });
        text = await response.text();
      } catch {
        if (controller.signal.aborted) throw new Error("Cancelled");
        failedIndexes.push(index.id);
        continue;
      } finally {
        clearTimeout(indexTimeout);
        controller.signal.removeEventListener("abort", abortIndex);
      }
      if ([502, 504].includes(response.status)) {
        failedIndexes.push(index.id);
        continue;
      }
      // The service uses a specific JSON 404 response for an empty index query.
      if (response.status === 404) {
        let empty;
        try {
          empty = JSON.parse(text);
        } catch {
          throw new Error("Unexpected 404 response");
        }
        const emptyMessage = empty?.message || empty?.error;
        if (
          typeof emptyMessage !== "string" ||
          !/^No Captures found for:/i.test(emptyMessage)
        )
          throw new Error("Unexpected 404 response");
        checkedIndexes.push(index.id);
        continue;
      }
      if (!response.ok) {
        if (fetcher === fetch && [429, 503].includes(response.status))
          crawlCooldownUntil = Date.now() + 60000;
        throw new Error(
          response.status === 429 || response.status === 503
            ? "Rate limited. Wait at least a minute before retrying."
            : `Index HTTP ${response.status}`,
        );
      }
      checkedIndexes.push(index.id);
      if (!text.trim())
        throw new Error(
          "Empty response without an explicit no-captures result",
        );
      const record = JSON.parse(text.trim().split("\n")[0]);
      if (
        !record ||
        typeof record.url !== "string" ||
        typeof record.timestamp !== "string" ||
        !/^\d{14}$/.test(record.timestamp) ||
        String(record.status) !== "200" ||
        typeof record.filename !== "string" ||
        !record.filename.startsWith("crawl-data/")
      )
        throw new Error("Unexpected crawl record");
      const matched = new URL(record.url);
      const comparable = (url: URL) => {
        const query = new URLSearchParams(url.search);
        query.sort();
        return `${url.hostname.replace(/^www\./, "")}${url.pathname}?${query}`;
      };
      if (
        !["http:", "https:"].includes(matched.protocol) ||
        comparable(matched) !== comparable(target)
      )
        throw new Error("Unexpected URL match");
      const result: Availability = {
        ...base,
        checkedIndexes: [...checkedIndexes],
        status: "found",
        queriedUrl: target.href,
        timestamp: record.timestamp,
        recordUrl: endpoint.href,
        message: `Successful crawl record found in ${index.id}. This is an index record, not a replay or verified media file.`,
      };
      if (fetcher === fetch)
        cache.set(key, { expires: Date.now() + 300000, result });
      return result;
    }
    if (failedIndexes.length > 0)
      return {
        ...base,
        checkedIndexes: [...checkedIndexes],
        failedIndexes: [...failedIndexes],
        status: "error",
        queriedUrl: target.href,
        message: `Common Crawl could not complete ${failedIndexes.length} index checks because of upstream timeouts or network errors. No absence can be concluded; try again later or use the manual index search.`,
      };
    const result: Availability = {
      ...base,
      checkedIndexes: [...checkedIndexes],
      status: "not-found",
      queriedUrl: target.href,
      message: `No successful capture returned in the ${checkedIndexes.length} recent indexes checked. Older crawls may still contain this URL.`,
    };
    if (fetcher === fetch)
      cache.set(key, { expires: Date.now() + 300000, result });
    return result;
  } catch (error) {
    return {
      ...base,
      checkedIndexes: [...checkedIndexes],
      status: "error",
      message: controller.signal.aborted
        ? "Common Crawl check timed out or was cancelled. Coverage is incomplete."
        : `Could not check Common Crawl: ${error instanceof Error ? error.message : "network or browser restriction"}. Coverage is incomplete.`,
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
