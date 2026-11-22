import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchLiveMarket,
  fetchMarketHistory,
  readCachedLiveMarket,
} from '../services/marketApi';
import type {
  LiveMarketData,
  MarketHistoryResponse,
  MetalType,
  TimeRange,
} from '../types/market';

const POLL_INTERVAL_MS = 15_000;

export function useMarketData(activeMetal: MetalType, activeRange: TimeRange) {
  const [liveData, setLiveData] = useState<LiveMarketData | null>(() => readCachedLiveMarket());
  const [liveLoading, setLiveLoading] = useState<boolean>(() => !readCachedLiveMarket());
  const [syncing, setSyncing] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const [historyData, setHistoryData] = useState<MarketHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const historyCacheRef = useRef<Map<string, MarketHistoryResponse>>(new Map());
  const inFlightLiveRef = useRef(false);

  const refreshLive = useCallback(async (force = false) => {
    if (inFlightLiveRef.current) return;
    inFlightLiveRef.current = true;
    setSyncing(true);
    try {
      const data = await fetchLiveMarket(force);
      startTransition(() => {
        setLiveData(data);
        setLiveError(null);
        setLiveLoading(false);
      });
    } catch {
      setLiveError('Live bullion feed delayed. Showing latest cached quotes.');
      setLiveLoading(false);
    } finally {
      inFlightLiveRef.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void refreshLive(false);

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void refreshLive(false);
      }
    }, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void refreshLive(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshLive]);

  useEffect(() => {
    const key = `${activeMetal}_${activeRange}`;
    const cached = historyCacheRef.current.get(key);
    if (cached) {
      setHistoryData(cached);
      setHistoryLoading(false);
      setHistoryError(null);
      return;
    }

    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError(null);

    fetchMarketHistory(activeMetal, activeRange, controller.signal)
      .then((res) => {
        historyCacheRef.current.set(key, res);
        startTransition(() => {
          setHistoryData(res);
          setHistoryLoading(false);
        });
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        setHistoryError('Could not load historical chart series.');
        setHistoryLoading(false);
      });

    return () => controller.abort();
  }, [activeMetal, activeRange]);

  return {
    liveData,
    liveLoading,
    syncing,
    liveError,
    refreshLive,
    historyData,
    historyLoading,
    historyError,
  };
}
