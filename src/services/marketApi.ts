import type { LiveMarketData, MarketHistoryResponse, MetalType, TimeRange } from '../types/market';

const CACHE_KEY_LIVE = 'aurumpulse_live_cache_v1';

export function readCachedLiveMarket(): LiveMarketData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_LIVE);
    if (!raw) return null;
    return JSON.parse(raw) as LiveMarketData;
  } catch {
    return null;
  }
}

export async function fetchLiveMarket(
  forceRefresh = false,
  signal?: AbortSignal
): Promise<LiveMarketData> {
  const url = forceRefresh ? '/api/market/live?refresh=1' : '/api/market/live';
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Live market feed error (${res.status})`);
  }
  const data = (await res.json()) as LiveMarketData;
  try {
    localStorage.setItem(CACHE_KEY_LIVE, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
  return data;
}

export async function fetchMarketHistory(
  metal: MetalType,
  range: TimeRange,
  signal?: AbortSignal
): Promise<MarketHistoryResponse> {
  const params = new URLSearchParams({ metal, range });
  const res = await fetch(`/api/market/history?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Historical data error (${res.status})`);
  }
  return (await res.json()) as MarketHistoryResponse;
}
