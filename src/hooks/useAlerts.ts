import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addPriceAlert,
  deletePriceAlert,
  markPriceAlertTriggered,
  subscribeAlerts,
  togglePriceAlertStatus,
} from '../services/firestoreService';
import { sendPricePushNotification } from '../services/notifications';
import type { IndiaCity, LiveMarketData, PriceAlert } from '../types/market';
import { convertSpotPrice, formatCurrency, unitLabel } from '../utils/bullionMath';

const LOCAL_ALERTS_KEY = 'aurumpulse_local_alerts_v1';

export interface TriggeredBanner {
  id: string;
  title: string;
  body: string;
}

function loadLocalAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(LOCAL_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PriceAlert[]) : [];
  } catch {
    return [];
  }
}

export function useAlerts(
  userId: string | null,
  profileReady: boolean,
  liveData: LiveMarketData | null,
  includeIndiaTaxes: boolean,
  indiaCity: IndiaCity
) {
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => (userId ? [] : loadLocalAlerts()));
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [banners, setBanners] = useState<TriggeredBanner[]>([]);

  const firingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setAlerts(loadLocalAlerts());
      setLoading(false);
      setError(null);
      return;
    }

    if (!profileReady) {
      setLoading(true);
      return;
    }

    setLoading(true);
    const unsub = subscribeAlerts(
      userId,
      (items) => {
        setAlerts(items);
        setLoading(false);
        setError(null);
      },
      () => {
        setError('Unable to sync price alerts.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId, profileReady]);

  // Evaluate active price alerts against live market ticks
  useEffect(() => {
    if (!liveData || alerts.length === 0) return;

    const activeAlerts = alerts.filter((a) => a.status === 'active');
    for (const alert of activeAlerts) {
      if (firingIdsRef.current.has(alert.id)) continue;

      const spotUsdOz =
        alert.metal === 'GOLD' ? liveData.gold.priceUsdOz : liveData.silver.priceUsdOz;

      const currentVal = convertSpotPrice({
        priceUsdOz: spotUsdOz,
        usdToInr: liveData.usdToInr,
        currency: alert.currency,
        unit: alert.unit,
        purity: alert.metal === 'GOLD' ? '24K' : '999',
        includeIndiaTaxes,
        city: indiaCity,
        metal: alert.metal,
      });

      const crossed =
        (alert.condition === 'ABOVE' && currentVal >= alert.targetPrice) ||
        (alert.condition === 'BELOW' && currentVal <= alert.targetPrice);

      if (!crossed) continue;

      firingIdsRef.current.add(alert.id);
      const metalName = alert.metal === 'GOLD' ? 'Gold (24K)' : 'Silver (999)';
      const dirWord = alert.condition === 'ABOVE' ? 'rose above' : 'dropped below';
      const title = `${metalName} Price Alert Triggered`;
      const body = `${metalName} ${dirWord} ${formatCurrency(alert.targetPrice, alert.currency)}/${unitLabel(alert.unit)}. Current: ${formatCurrency(currentVal, alert.currency)}${alert.note ? ` · ${alert.note}` : ''}`;

      void sendPricePushNotification({ title, body, tag: alert.id });
      setBanners((prev) => [{ id: alert.id, title, body }, ...prev].slice(0, 3));

      if (userId) {
        void markPriceAlertTriggered(userId, alert.id, currentVal).catch(() => {
          firingIdsRef.current.delete(alert.id);
        });
      } else {
        setAlerts((prev) => {
          const next = prev.map((item) =>
            item.id === alert.id
              ? {
                  ...item,
                  status: 'triggered' as const,
                  triggeredPrice: Number(currentVal.toFixed(2)),
                }
              : item
          );
          try {
            localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(next));
          } catch {
            // Ignore
          }
          return next;
        });
      }
    }
  }, [alerts, liveData, includeIndiaTaxes, indiaCity, userId]);

  const createAlert = useCallback(
    async (input: Omit<PriceAlert, 'id' | 'userId' | 'status' | 'triggeredPrice'>) => {
      if (userId) {
        await addPriceAlert(userId, input);
        return;
      }

      const item: PriceAlert = {
        ...input,
        id: `local_alt_${Date.now()}`,
        userId: 'local',
        status: 'active',
        triggeredPrice: 0,
      };
      setAlerts((prev) => {
        const next = [item, ...prev];
        try {
          localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    [userId]
  );

  const toggleAlert = useCallback(
    async (alert: PriceAlert) => {
      if (alert.status === 'triggered') return;
      const nextStatus: 'active' | 'paused' = alert.status === 'active' ? 'paused' : 'active';
      if (userId) {
        await togglePriceAlertStatus(userId, alert.id, nextStatus);
        return;
      }

      setAlerts((prev) => {
        const next: PriceAlert[] = prev.map((a) =>
          a.id === alert.id ? { ...a, status: nextStatus } : a
        );
        try {
          localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    [userId]
  );

  const removeAlert = useCallback(
    async (alertId: string) => {
      firingIdsRef.current.delete(alertId);
      if (userId) {
        await deletePriceAlert(userId, alertId);
        return;
      }

      setAlerts((prev) => {
        const next = prev.filter((a) => a.id !== alertId);
        try {
          localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    [userId]
  );

  const dismissBanner = useCallback((id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return {
    alerts,
    loading,
    error,
    banners,
    createAlert,
    toggleAlert,
    removeAlert,
    dismissBanner,
  };
}
