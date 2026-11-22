import { Bell, BellOff, BellRing, Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendPricePushNotification,
  type NotificationPermissionState,
} from '../services/notifications';
import type {
  AlertCondition,
  CurrencyType,
  IndiaCity,
  LiveMarketData,
  MetalType,
  PriceAlert,
  WeightUnit,
} from '../types/market';
import { convertSpotPrice, formatCurrency, unitLabel } from '../utils/bullionMath';

interface AlertsViewProps {
  alerts: PriceAlert[];
  loading: boolean;
  liveData: LiveMarketData | null;
  defaultMetal: MetalType;
  displayCurrency: CurrencyType;
  includeIndiaTaxes: boolean;
  indiaCity: IndiaCity;
  isSignedIn: boolean;
  onSignIn: () => void;
  onCreateAlert: (
    input: Omit<PriceAlert, 'id' | 'userId' | 'status' | 'triggeredPrice'>
  ) => Promise<void>;
  onToggleAlert: (alert: PriceAlert) => Promise<void>;
  onDeleteAlert: (alertId: string) => Promise<void>;
  onNotificationsOptIn: (enabled: boolean) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  loading,
  liveData,
  defaultMetal,
  displayCurrency,
  includeIndiaTaxes,
  indiaCity,
  isSignedIn,
  onSignIn,
  onCreateAlert,
  onToggleAlert,
  onDeleteAlert,
  onNotificationsOptIn,
}) => {
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  );
  const [testNotice, setTestNotice] = useState<string | null>(null);

  const [metal, setMetal] = useState<MetalType>(defaultMetal);
  const [condition, setCondition] = useState<AlertCondition>('ABOVE');
  const [currency, setCurrency] = useState<CurrencyType>(displayCurrency);
  const [unit, setUnit] = useState<WeightUnit>(
    displayCurrency === 'INR' ? (defaultMetal === 'GOLD' ? '10g' : 'kg') : 'oz'
  );
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setMetal(defaultMetal);
    setUnit(displayCurrency === 'INR' ? (defaultMetal === 'GOLD' ? '10g' : 'kg') : 'oz');
  }, [defaultMetal, displayCurrency]);

  const currentRefPrice = liveData
    ? convertSpotPrice({
        priceUsdOz: metal === 'GOLD' ? liveData.gold.priceUsdOz : liveData.silver.priceUsdOz,
        usdToInr: liveData.usdToInr,
        currency,
        unit,
        purity: metal === 'GOLD' ? '24K' : '999',
        includeIndiaTaxes,
        city: indiaCity,
        metal,
      })
    : 0;

  const applyOffset = (pct: number) => {
    if (!currentRefPrice) return;
    const val = currentRefPrice * (1 + pct / 100);
    setCondition(pct >= 0 ? 'ABOVE' : 'BELOW');
    setTargetPrice(val.toFixed(currency === 'INR' ? 0 : 2));
  };

  const handleEnableNotifications = async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
    if (next === 'granted') {
      onNotificationsOptIn(true);
      await sendPricePushNotification({
        title: 'AurumPulse Alerts Enabled',
        body: 'You will receive instant push notifications when Gold or Silver crosses your price thresholds.',
        tag: 'aurumpulse-welcome',
      });
      setTestNotice('Push notifications enabled.');
    }
  };

  const handleSendTest = async () => {
    const sent = await sendPricePushNotification({
      title: 'AurumPulse Test Price Alert',
      body: liveData
        ? `Gold 24K live check: ${formatCurrency(
            convertSpotPrice({
              priceUsdOz: liveData.gold.priceUsdOz,
              usdToInr: liveData.usdToInr,
              currency: 'INR',
              unit: '10g',
              purity: '24K',
              includeIndiaTaxes,
              city: indiaCity,
              metal: 'GOLD',
            }),
            'INR',
            0
          )}/10g`
        : 'Push notifications are configured and active.',
      tag: `test_${Date.now()}`,
    });
    setTestNotice(
      sent
        ? 'Test push notification dispatched to your device.'
        : 'Enable browser notifications first to receive OS alerts.'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const val = Number(targetPrice);
    if (!Number.isFinite(val) || val <= 0) {
      setFormError('Enter a valid target price greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      await onCreateAlert({
        metal,
        condition,
        targetPrice: val,
        currency,
        unit,
        note: note.trim().slice(0, 80),
      });
      setTargetPrice('');
      setNote('');
    } catch {
      setFormError('Could not save price alert. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRearm = async (alert: PriceAlert) => {
    await onCreateAlert({
      metal: alert.metal,
      condition: alert.condition,
      targetPrice: alert.targetPrice,
      currency: alert.currency,
      unit: alert.unit,
      note: alert.note,
    });
  };

  return (
    <div className="space-y-5">
      {/* Push Notification Status & Permissions */}
      <section className="rounded-2xl bg-[#131720] border border-white/[0.08] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B0D11] border border-white/[0.08] flex items-center justify-center shrink-0">
              {permission === 'granted' ? (
                <BellRing className="w-5 h-5 text-[#D4AF37]" />
              ) : permission === 'denied' ? (
                <BellOff className="w-5 h-5 text-rose-400" />
              ) : (
                <Bell className="w-5 h-5 text-slate-300" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Price Alert Notifications</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {permission === 'granted'
                  ? 'Push notifications active — alerts fire automatically on live price ticks.'
                  : permission === 'denied'
                  ? 'Notifications blocked in browser settings. In-app banners will still appear.'
                  : permission === 'unsupported'
                  ? 'Device notifications unavailable in this context. In-app banners are active.'
                  : 'Enable OS push notifications to receive alerts even when browsing other tabs.'}
              </p>
              {testNotice && <p className="mt-1.5 text-xs text-emerald-400">{testNotice}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!isSignedIn && (
              <button
                type="button"
                onClick={onSignIn}
                className="min-h-[44px] px-3.5 rounded-xl border border-white/[0.12] bg-[#0B0D11] text-xs font-medium text-slate-200 hover:border-[#D4AF37]/50 whitespace-nowrap"
              >
                Sign in to sync
              </button>
            )}
            {permission === 'granted' ? (
              <button
                type="button"
                onClick={() => void handleSendTest()}
                className="min-h-[44px] px-4 rounded-xl border border-white/[0.12] bg-[#0B0D11] text-xs font-semibold text-slate-200 hover:border-[#D4AF37]/50 hover:text-[#F2D06B] whitespace-nowrap"
              >
                Send Test Notification
              </button>
            ) : permission === 'default' ? (
              <button
                type="button"
                onClick={() => void handleEnableNotifications()}
                className="min-h-[44px] px-4 rounded-xl bg-[#D4AF37] text-[#0B0D11] text-xs font-semibold hover:bg-[#E5BE52] whitespace-nowrap"
              >
                Enable Push Notifications
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Create Alert Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-[#131720] border border-white/[0.08] p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-white">Create Price Threshold</h3>
          {currentRefPrice > 0 && (
            <span className="text-xs font-mono tabular-nums text-slate-400">
              Live {metal === 'GOLD' ? 'Gold' : 'Silver'}:{' '}
              <strong className="text-slate-200">
                {formatCurrency(currentRefPrice, currency)}/{unitLabel(unit)}
              </strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="a-metal" className="block text-xs text-slate-400 mb-1.5">
              Metal
            </label>
            <select
              id="a-metal"
              value={metal}
              onChange={(e) => {
                const m = e.target.value as MetalType;
                setMetal(m);
                if (currency === 'INR') setUnit(m === 'GOLD' ? '10g' : 'kg');
              }}
              className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="GOLD">Gold (24K)</option>
              <option value="SILVER">Silver (999)</option>
            </select>
          </div>

          <div>
            <label htmlFor="a-cond" className="block text-xs text-slate-400 mb-1.5">
              Trigger When
            </label>
            <select
              id="a-cond"
              value={condition}
              onChange={(e) => setCondition(e.target.value as AlertCondition)}
              className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="ABOVE">Rises above</option>
              <option value="BELOW">Drops below</option>
            </select>
          </div>

          <div>
            <label htmlFor="a-curr" className="block text-xs text-slate-400 mb-1.5">
              Currency
            </label>
            <select
              id="a-curr"
              value={currency}
              onChange={(e) => {
                const c = e.target.value as CurrencyType;
                setCurrency(c);
                setUnit(c === 'INR' ? (metal === 'GOLD' ? '10g' : 'kg') : 'oz');
              }}
              className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          <div>
            <label htmlFor="a-unit" className="block text-xs text-slate-400 mb-1.5">
              Unit
            </label>
            <select
              id="a-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as WeightUnit)}
              className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="10g">10 Grams</option>
              <option value="1g">1 Gram</option>
              <option value="oz">Troy Oz</option>
              <option value="kg">1 Kilogram</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="a-target" className="block text-xs text-slate-400 mb-1.5">
              Target Price ({currency} per {unitLabel(unit)})
            </label>
            <input
              id="a-target"
              type="number"
              inputMode="decimal"
              step="any"
              min="0.01"
              required
              placeholder={
                currentRefPrice
                  ? currentRefPrice.toFixed(currency === 'INR' ? 0 : 2)
                  : 'Enter price'
              }
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 font-mono text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            />
            {currentRefPrice > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                {[-2, -1, 1, 2].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyOffset(pct)}
                    className="min-h-[32px] px-2.5 rounded-lg bg-[#0B0D11] border border-white/[0.08] font-mono text-[11px] text-slate-300 hover:border-[#D4AF37]/50 hover:text-[#F2D06B]"
                  >
                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="a-note" className="block text-xs text-slate-400 mb-1.5">
              Trading Reminder (optional)
            </label>
            <input
              id="a-note"
              type="text"
              maxLength={80}
              placeholder="e.g. Buy dip tranche, Book partial profit"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {formError && <p className="text-xs text-rose-400">{formError}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-xl bg-[#D4AF37] text-[#0B0D11] text-sm font-semibold hover:bg-[#E5BE52] disabled:opacity-60"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{submitting ? 'Adding...' : 'Create Alert'}</span>
          </button>
        </div>
      </form>

      {/* Active & Triggered Alerts List */}
      <section className="rounded-2xl bg-[#131720] border border-white/[0.08] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Configured Alerts</h3>
          <span className="text-xs font-mono text-slate-400">
            {alerts.filter((a) => a.status === 'active').length} active
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-400">Syncing price alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-300">No price alerts configured.</p>
            <p className="mt-1 text-xs text-slate-500">
              Set an upper breakout or dip threshold above to receive instant push notifications.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {alerts.map((alert) => {
              const statusText =
                alert.status === 'active'
                  ? 'Active'
                  : alert.status === 'paused'
                  ? 'Paused'
                  : `Triggered at ${formatCurrency(alert.triggeredPrice, alert.currency)}`;

              const statusColor =
                alert.status === 'active'
                  ? 'text-emerald-400'
                  : alert.status === 'paused'
                  ? 'text-slate-400'
                  : 'text-[#F2D06B]';

              return (
                <div
                  key={alert.id}
                  className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: alert.metal === 'GOLD' ? '#D4AF37' : '#CBD5E1',
                        }}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-semibold text-white">
                        {alert.metal === 'GOLD' ? 'Gold' : 'Silver'}{' '}
                        {alert.condition === 'ABOVE' ? '≥' : '≤'}{' '}
                        <span className="font-mono tabular-nums">
                          {formatCurrency(alert.targetPrice, alert.currency)}/{unitLabel(alert.unit)}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400 flex flex-wrap items-center gap-1.5">
                      <span className={`font-medium ${statusColor}`}>{statusText}</span>
                      {alert.note && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{alert.note}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {alert.status !== 'triggered' ? (
                      <button
                        type="button"
                        onClick={() => void onToggleAlert(alert)}
                        aria-label={alert.status === 'active' ? 'Pause alert' : 'Resume alert'}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-white/[0.1] bg-[#0B0D11] text-slate-300 hover:text-white"
                      >
                        {alert.status === 'active' ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleRearm(alert)}
                        className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-white/[0.1] bg-[#0B0D11] text-xs font-medium text-slate-200 hover:border-[#D4AF37]/50 hover:text-[#F2D06B]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-arm</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void onDeleteAlert(alert.id)}
                      aria-label="Delete price alert"
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
