import { useCallback, useEffect, useState } from 'react';
import {
  addPortfolioHolding,
  deletePortfolioHolding,
  subscribeHoldings,
} from '../services/firestoreService';
import type { PortfolioHolding } from '../types/market';

const LOCAL_HOLDINGS_KEY = 'aurumpulse_local_holdings_v1';

function loadLocalHoldings(): PortfolioHolding[] {
  try {
    const raw = localStorage.getItem(LOCAL_HOLDINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PortfolioHolding[]) : [];
  } catch {
    return [];
  }
}

export function usePortfolio(userId: string | null, profileReady: boolean) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(() =>
    userId ? [] : loadLocalHoldings()
  );
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setHoldings(loadLocalHoldings());
      setLoading(false);
      setError(null);
      return;
    }

    if (!profileReady) {
      setLoading(true);
      return;
    }

    setLoading(true);
    const unsub = subscribeHoldings(
      userId,
      (items) => {
        setHoldings(items);
        setLoading(false);
        setError(null);
      },
      () => {
        setError('Unable to sync portfolio holdings.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId, profileReady]);

  const addHolding = useCallback(
    async (input: Omit<PortfolioHolding, 'id' | 'userId'>) => {
      if (userId) {
        await addPortfolioHolding(userId, input);
        return;
      }

      const item: PortfolioHolding = {
        ...input,
        id: `local_${Date.now()}`,
        userId: 'local',
      };
      setHoldings((prev) => {
        const next = [item, ...prev];
        try {
          localStorage.setItem(LOCAL_HOLDINGS_KEY, JSON.stringify(next));
        } catch {
          // Ignore quota
        }
        return next;
      });
    },
    [userId]
  );

  const removeHolding = useCallback(
    async (holdingId: string) => {
      if (userId) {
        await deletePortfolioHolding(userId, holdingId);
        return;
      }

      setHoldings((prev) => {
        const next = prev.filter((h) => h.id !== holdingId);
        try {
          localStorage.setItem(LOCAL_HOLDINGS_KEY, JSON.stringify(next));
        } catch {
          // Ignore quota
        }
        return next;
      });
    },
    [userId]
  );

  return {
    holdings,
    loading,
    error,
    addHolding,
    removeHolding,
  };
}
