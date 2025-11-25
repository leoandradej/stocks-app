"use server";

import { getDateRange, validateArticle, formatArticle } from "@/lib/utils";
import { POPULAR_STOCK_SYMBOLS } from "@/lib/constants";
import { getCurrentUserWatchlistSymbols } from "@/lib/actions/watchlist.actions";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const NEXT_PUBLIC_FINNHUB_API_KEY =
  process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";

async function fetchJSON<T>(
  url: string,
  revalidateSeconds?: number
): Promise<T> {
  const options: RequestInit & { next?: { revalidate?: number } } =
    revalidateSeconds
      ? { cache: "force-cache", next: { revalidate: revalidateSeconds } }
      : { cache: "no-store" };

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fetch failed ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export { fetchJSON };

const TOKEN = process.env.FINNHUB_API_KEY ?? NEXT_PUBLIC_FINNHUB_API_KEY ?? "";
function requireToken() {
  if (!TOKEN) throw new Error("FINNHUB API key is not configured");
  return TOKEN;
}

export async function getQuote(symbol: string): Promise<QuoteData> {
  const token = requireToken();
  const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
  return fetchJSON<QuoteData>(url, 15);
}

export async function getProfile(symbol: string): Promise<ProfileData> {
  const token = requireToken();
  const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`;
  return fetchJSON<ProfileData>(url, 3600);
}

export async function getMetrics(symbol: string): Promise<FinancialsData> {
  const token = requireToken();
  const url = `${FINNHUB_BASE_URL}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${token}`;
  return fetchJSON<FinancialsData>(url, 86400);
}

function formatCurrency(n?: number): string | undefined {
  if (typeof n !== "number" || Number.isNaN(n)) return undefined;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPct(n?: number): string | undefined {
  if (typeof n !== "number" || Number.isNaN(n)) return undefined;
  return `${n.toFixed(2)}%`;
}

function abbreviate(n?: number): string | undefined {
  if (typeof n !== "number" || Number.isNaN(n)) return undefined;
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

export async function buildWatchlistData(
  items: { symbol: string; company: string; addedAt: Date }[]
): Promise<StockWithData[]> {
  if (!items?.length) return [];

  const rows = await Promise.all(
    items.map(async ({ symbol, company, addedAt }) => {
      try {
        const [quote, profile, metrics] = await Promise.all([
          getQuote(symbol),
          getProfile(symbol),
          getMetrics(symbol),
        ]);

        const currentPrice = typeof quote?.c === "number" ? quote.c : undefined;
        const changePercent = typeof quote?.dp === "number" ? quote.dp : undefined;
        const marketCapRaw = profile?.marketCapitalization; // Finnhub profile2 returns USD in billions for some; keep as-is
        const peRaw = metrics?.metric?.peBasicExclExtraTTM ?? metrics?.metric?.peTTM;

        return {
          userId: "",
          symbol,
          company,
          addedAt,
          currentPrice,
          changePercent,
          priceFormatted: formatCurrency(currentPrice),
          changeFormatted: formatPct(changePercent),
          marketCap: marketCapRaw !== undefined ? abbreviate(marketCapRaw >= 1e6 ? marketCapRaw : marketCapRaw * 1_000_000_000) : undefined,
          peRatio: typeof peRaw === "number" ? peRaw.toFixed(2) : undefined,
        } as StockWithData;
      } catch (e) {
        console.error("hydrate watchlist row error", symbol, e);
        return {
          userId: "",
          symbol,
          company,
          addedAt,
        } as StockWithData;
      }
    })
  );

  return rows;
}

export async function getNews(
  symbols?: string[]
): Promise<MarketNewsArticle[]> {
  try {
    const range = getDateRange(5);
    const token = process.env.FINNHUB_API_KEY ?? NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!token) {
      throw new Error("FINNHUB API key is not configured");
    }
    const cleanSymbols = (symbols || [])
      .map((s) => s?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s));

    const maxArticles = 6;

    // If we have symbols, try to fetch company news per symbol and round-robin select
    if (cleanSymbols.length > 0) {
      const perSymbolArticles: Record<string, RawNewsArticle[]> = {};

      await Promise.all(
        cleanSymbols.map(async (sym) => {
          try {
            const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(
              sym
            )}&from=${range.from}&to=${range.to}&token=${token}`;
            const articles = await fetchJSON<RawNewsArticle[]>(url, 300);
            perSymbolArticles[sym] = (articles || []).filter(validateArticle);
          } catch (e) {
            console.error("Error fetching company news for", sym, e);
            perSymbolArticles[sym] = [];
          }
        })
      );

      const collected: MarketNewsArticle[] = [];
      // Round-robin up to 6 picks
      for (let round = 0; round < maxArticles; round++) {
        for (let i = 0; i < cleanSymbols.length; i++) {
          const sym = cleanSymbols[i];
          const list = perSymbolArticles[sym] || [];
          if (list.length === 0) continue;
          const article = list.shift();
          if (!article || !validateArticle(article)) continue;
          collected.push(formatArticle(article, true, sym, round));
          if (collected.length >= maxArticles) break;
        }
        if (collected.length >= maxArticles) break;
      }

      if (collected.length > 0) {
        // Sort by datetime desc
        collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
        return collected.slice(0, maxArticles);
      }
      // If none collected, fall through to general news
    }

    // General market news fallback or when no symbols provided
    const generalUrl = `${FINNHUB_BASE_URL}/news?category=general&token=${token}`;
    const general = await fetchJSON<RawNewsArticle[]>(generalUrl, 300);

    const seen = new Set<string>();
    const unique: RawNewsArticle[] = [];
    for (const art of general || []) {
      if (!validateArticle(art)) continue;
      const key = `${art.id}-${art.url}-${art.headline}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(art);
      if (unique.length >= 20) break; // cap early before final slicing
    }

    const formatted = unique
      .slice(0, maxArticles)
      .map((a, idx) => formatArticle(a, false, undefined, idx));
    return formatted;
  } catch (err) {
    console.error("getNews error:", err);
    throw new Error("Failed to fetch news");
  }
}

export async function searchStocks(
  query?: string
): Promise<StockWithWatchlistStatus[]> {
  try {
      const token = process.env.FINNHUB_API_KEY ?? NEXT_PUBLIC_FINNHUB_API_KEY;
      if (!token) {
        // If no token, log and return empty to avoid throwing per requirements
        console.error(
          "Error in stock search:",
          new Error("FINNHUB API key is not configured")
        );
        return [];
      }

      const trimmed = typeof query === "string" ? query.trim() : "";

      let results: FinnhubSearchResult[] = [];

      if (!trimmed) {
        // Fetch top 10 popular symbols' profiles
        const top = POPULAR_STOCK_SYMBOLS.slice(0, 10);
        const profiles = await Promise.all(
          top.map(async (sym) => {
            try {
              const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(
                sym
              )}&token=${token}`;
              // Revalidate every hour
              const profile = await fetchJSON<FinnhubProfile>(url, 3600);
              return { sym, profile };
            } catch (e) {
              console.error("Error fetching profile2 for", sym, e);
              return { sym, profile: null };
            }
          })
        );

        results = profiles
          .map(({ sym, profile }) => {
            const symbol = sym.toUpperCase();
            const name: string | undefined =
              profile?.name || profile?.ticker || undefined;
            const exchange: string | undefined = profile?.exchange || undefined;
            if (!name) return undefined;
            const r: FinnhubSearchResultWithExchange = {
              symbol,
              description: name,
              displaySymbol: symbol,
              type: "Common Stock",
              __exchange: exchange,
            };
            return r;
          })
          .filter((x): x is FinnhubSearchResultWithExchange => Boolean(x));
      } else {
        const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(
          trimmed
        )}&token=${token}`;
        const data = await fetchJSON<FinnhubSearchResponse>(url, 1800);
        results = Array.isArray(data?.result) ? data.result : [];
      }

      // Fetch user's watchlist symbols to flag results
      const userSymbols = await getCurrentUserWatchlistSymbols();
      const set = new Set((userSymbols || []).map((s) => s.toUpperCase()));

      const mapped: StockWithWatchlistStatus[] = results
        .map((r) => {
          const upper = (r.symbol || "").toUpperCase();
          const name = r.description || upper;
          const exchangeFromDisplay =
            (r.displaySymbol as string | undefined) || undefined;
          const resultWithExchange = r as FinnhubSearchResultWithExchange;
          const exchangeFromProfile = resultWithExchange.__exchange;
          const exchange = exchangeFromDisplay || exchangeFromProfile || "US";
          const type = r.type || "Stock";
          const item: StockWithWatchlistStatus = {
            symbol: upper,
            name,
            exchange,
            type,
            isInWatchlist: set.has(upper),
          };
          return item;
        })
        .slice(0, 15);

      return mapped;
    } catch (err) {
      console.error("Error in stock search:", err);
      return [];
    }
}
