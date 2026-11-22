import { Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type {
  CurrencyType,
  HoldingUnit,
  IndiaCity,
  LiveMarketData,
  MetalType,
  PortfolioHolding,
  PurityGrade,
} from '../types/market';
import {
  convertSpotPrice,
  formatCurrency,
  formatSignedPct,
  unitLabel,
} from '../utils/bullionMath';

interface PortfolioViewProps {
  holdings: PortfolioHolding[];
  loading: boolean;
  liveData: LiveMarketData | null;
  displayCurrency: CurrencyType;
  includeIndiaTaxes: boolean;
  indiaCity: IndiaCity;
  isSignedIn: boolean;
  onSignIn: () => void;
  onAddHolding: (input: Omit<PortfolioHolding, 'id' | 'userId'>) => Promise<void>;
  onDeleteHolding: (id: string) => Promise<void>;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  holdings,
  loading,
  liveData,
  displayCurrency,
  includeIndiaTaxes,
  indiaCity,
  isSignedIn,
  onSignIn,
  onAddHolding,
  onDeleteHolding,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [metal, setMetal] = useState<MetalType>('GOLD');
  const [purity, setPurity] = useState<PurityGrade>('24K');
  const [quantity, setQuantity] = useState<string>('10');
  const [unit, setUnit] = useState<HoldingUnit>('g');
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [currency, setCurrency] = useState<CurrencyType>(displayCurrency);
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [label, setLabel] = useState<string>('');

  const fxRate = liveData?.usdToInr ?? 84.65;

  const fillLivePrice = () => {
    if (!liveData) return;
    const spot = metal === 'GOLD' ? liveData.gold.priceUsdOz : liveData.silver.priceUsdOz;
    const val = convertSpotPrice({
      priceUsdOz: spot,
      usdToInr: fxRate,
      currency,
      unit,
      purity: metal === 'SILVER' ? '999' : purity,
      includeIndiaTaxes,
      city: indiaCity,
      metal,
    });
    setBuyPrice(val.toFixed(currency === 'INR' ? 0 : 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const qtyNum = Number(quantity);
    const buyNum = Number(buyPrice);

    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setFormError('Enter a valid quantity greater than 0.');
      return;
    }
    if (!Number.isFinite(buyNum) || buyNum <= 0) {
      setFormError('Enter a valid buy price per unit.');
      return;
    }

    setSubmitting(true);
    try {
      await onAddHolding({
        metal,
        purity: metal === 'SILVER' ? '999' : purity,
        quantity: qtyNum,
        unit,
        buyPrice: buyNum,
        currency,
        purchaseDate,
        label: label.trim().slice(0, 60),
      });
      setLabel('');
      setBuyPrice('');
      setShowForm(false);
    } catch {
      setFormError('Could not save holding. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    let totalInvested = 0;
    let totalCurrent = 0;
    let goldValue = 0;
    let silverValue = 0;

    const evaluated = holdings.map((h) => {
      const investedNative = h.quantity * h.buyPrice;
      const investedInDisplay =
        h.currency === displayCurrency
          ? investedNative
          : h.currency === 'INR'
          ? investedNative / fxRate
          : investedNative * fxRate;

      const spotUsd =
        h.metal === 'GOLD'
          ? liveData?.gold.priceUsdOz ?? 0
          : liveData?.silver.priceUsdOz ?? 0;

      const currentUnitVal =
        spotUsd > 0
          ? convertSpotPrice({
              priceUsdOz: spotUsd,
              usdToInr: fxRate,
              currency: displayCurrency,
              unit: h.unit,
              purity: h.purity,
              includeIndiaTaxes,
              city: indiaCity,
              metal: h.metal,
            })
          : investedInDisplay / Math.max(h.quantity, 1);

      const currentVal = currentUnitVal * h.quantity;
      const pnl = currentVal - investedInDisplay;
      const pnlPct = investedInDisplay > 0 ? (pnl / investedInDisplay) * 100 : 0;

      totalInvested += investedInDisplay;
      totalCurrent += currentVal;
      if (h.metal === 'GOLD') goldValue += currentVal;
      else silverValue += currentVal;

      return {
        ...h,
        investedInDisplay,
        currentVal,
        pnl,
        pnlPct,
      };
    });

    const totalPnl = totalCurrent - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const goldAllocPct = totalCurrent > 0 ? (goldValue / totalCurrent) * 100 : 0;
    const silverAllocPct = totalCurrent > 0 ? (silverValue / totalCurrent) * 100 : 0;

    return {
      evaluated,
      totalInvested,
      totalCurrent,
      totalPnl,
      totalPnlPct,
      goldAllocPct,
      silverAllocPct,
    };
  }, [holdings, liveData, displayCurrency, fxRate, includeIndiaTaxes, indiaCity]);

  const isUp = summary.totalPnl >= 0;

  return (
    <div className="space-y-5">
      {/* Header & Summary */}
      <section className="rounded-2xl bg-[#131720] border border-white/[0.08] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Bullion Portfolio</h2>
            <p className="mt-1 text-xs text-slate-400">
              Live valuation in {displayCurrency}
              <span aria-hidden="true"> · </span>
              {isSignedIn ? 'Cloud synced to your account' : 'Local session mode'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {!isSignedIn && (
              <button
                type="button"
                onClick={onSignIn}
                className="min-h-[44px] px-4 rounded-xl border border-white/[0.12] bg-[#0B0D11] text-xs font-medium text-slate-200 hover:border-[#D4AF37]/50 transition-colors whitespace-nowrap"
              >
                Sign in to sync
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowForm((prev) => !prev);
                if (!buyPrice && liveData) fillLivePrice();
              }}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-[#D4AF37] text-[#0B0D11] text-sm font-semibold hover:bg-[#E5BE52] transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Holding</span>
            </button>
          </div>
        </div>

        {/* Portfolio Summary Metrics */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <div className="text-xs text-slate-400">Current Valuation</div>
            <div className="mt-1 font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-white">
              {formatCurrency(summary.totalCurrent, displayCurrency)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Total Invested</div>
            <div className="mt-1 font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-slate-200">
              {formatCurrency(summary.totalInvested, displayCurrency)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Unrealized Gain / Loss</div>
            <div
              className={`mt-1 inline-flex items-center gap-1.5 font-mono tabular-nums text-2xl sm:text-3xl font-semibold ${
                summary.totalInvested === 0
                  ? 'text-slate-400'
                  : isUp
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {summary.totalInvested > 0 &&
                (isUp ? (
                  <TrendingUp className="w-5 h-5 shrink-0" aria-hidden="true" />
                ) : (
                  <TrendingDown className="w-5 h-5 shrink-0" aria-hidden="true" />
                ))}
              <span>
                {summary.totalPnl > 0 ? '+' : ''}
                {formatCurrency(summary.totalPnl, displayCurrency)}
              </span>
            </div>
            {summary.totalInvested > 0 && (
              <div
                className={`mt-0.5 text-xs font-mono tabular-nums ${
                  isUp ? 'text-emerald-400/90' : 'text-rose-400/90'
                }`}
              >
                {formatSignedPct(summary.totalPnlPct)} overall return
              </div>
            )}
          </div>
        </div>

        {/* Allocation Bar */}
        {summary.totalCurrent > 0 && (
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
              <span>Gold {summary.goldAllocPct.toFixed(1)}%</span>
              <span>Silver {summary.silverAllocPct.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-white/[0.07] overflow-hidden flex">
              <div
                className="h-full bg-[#D4AF37]"
                style={{ width: `${summary.goldAllocPct}%` }}
              />
              <div
                className="h-full bg-slate-300"
                style={{ width: `${summary.silverAllocPct}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Add Holding Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-[#131720] border border-[#D4AF37]/30 p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Log New Bullion Lot</h3>
            <button
              type="button"
              onClick={fillLivePrice}
              className="text-xs font-medium text-[#F2D06B] hover:underline"
            >
              Use live price
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="h-metal" className="block text-xs text-slate-400 mb-1.5">
                Metal
              </label>
              <select
                id="h-metal"
                value={metal}
                onChange={(e) => {
                  const m = e.target.value as MetalType;
                  setMetal(m);
                  if (m === 'SILVER') setPurity('999');
                  else if (purity === '999') setPurity('24K');
                }}
                className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
              </select>
            </div>

            <div>
              <label htmlFor="h-purity" className="block text-xs text-slate-400 mb-1.5">
                Purity
              </label>
              <select
                id="h-purity"
                value={metal === 'SILVER' ? '999' : purity}
                disabled={metal === 'SILVER'}
                onChange={(e) => setPurity(e.target.value as PurityGrade)}
                className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-60"
              >
                {metal === 'GOLD' ? (
                  <>
                    <option value="24K">24K (999)</option>
                    <option value="22K">22K (916)</option>
                    <option value="18K">18K (750)</option>
                  </>
                ) : (
                  <option value="999">Fine 999</option>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="h-qty" className="block text-xs text-slate-400 mb-1.5">
                Quantity
              </label>
              <input
                id="h-qty"
                type="number"
                inputMode="decimal"
                step="any"
                min="0.001"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 font-mono text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label htmlFor="h-unit" className="block text-xs text-slate-400 mb-1.5">
                Unit
              </label>
              <select
                id="h-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as HoldingUnit)}
                className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="g">Gram (g)</option>
                <option value="10g">10 Grams</option>
                <option value="oz">Troy Oz</option>
                <option value="kg">Kilogram</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="h-buy" className="block text-xs text-slate-400 mb-1.5">
                Buy Price per {unitLabel(unit)}
              </label>
              <div className="flex gap-2">
                <select
                  aria-label="Purchase currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyType)}
                  className="min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
                <input
                  id="h-buy"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0.01"
                  required
                  placeholder="e.g. 7650"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 font-mono text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="h-date" className="block text-xs text-slate-400 mb-1.5">
                Purchase Date
              </label>
              <input
                id="h-date"
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 font-mono text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label htmlFor="h-label" className="block text-xs text-slate-400 mb-1.5">
                Note / Instrument (optional)
              </label>
              <input
                id="h-label"
                type="text"
                maxLength={60}
                placeholder="e.g. SGB 2024, 24K Coin"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {formError && <p className="text-xs text-rose-400">{formError}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-[44px] px-4 rounded-xl border border-white/[0.1] text-xs font-medium text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-5 rounded-xl bg-[#D4AF37] text-[#0B0D11] text-sm font-semibold hover:bg-[#E5BE52] disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save Holding'}
            </button>
          </div>
        </form>
      )}

      {/* Holdings Ledger */}
      <section className="rounded-2xl bg-[#131720] border border-white/[0.08] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Holdings Ledger</h3>
          <span className="text-xs font-mono text-slate-400">
            {holdings.length} {holdings.length === 1 ? 'lot' : 'lots'}
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-400">Syncing portfolio holdings...</div>
        ) : summary.evaluated.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-300">No bullion holdings logged yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Add your Gold coins, SGBs, ETFs, or Silver bars to monitor live unrealized gains and losses.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                if (liveData) fillLivePrice();
              }}
              className="mt-4 min-h-[44px] px-4 rounded-xl bg-[#D4AF37] text-[#0B0D11] text-xs font-semibold hover:bg-[#E5BE52]"
            >
              Log First Holding
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {summary.evaluated.map((item) => {
              const gain = item.pnl >= 0;
              return (
                <div
                  key={item.id}
                  className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: item.metal === 'GOLD' ? '#D4AF37' : '#CBD5E1',
                        }}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-semibold text-white">
                        {item.metal === 'GOLD' ? 'Gold' : 'Silver'} {item.purity}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-300">
                        {item.quantity} {unitLabel(item.unit)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {item.label ? `${item.label} · ` : ''}
                      Bought {item.purchaseDate} at {formatCurrency(item.buyPrice, item.currency)}/
                      {unitLabel(item.unit)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="sm:text-right">
                      <div className="font-mono tabular-nums text-sm font-semibold text-white">
                        {formatCurrency(item.currentVal, displayCurrency)}
                      </div>
                      <div
                        className={`font-mono tabular-nums text-xs ${
                          gain ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {gain ? '+' : ''}
                        {formatCurrency(item.pnl, displayCurrency)} ({formatSignedPct(item.pnlPct)})
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void onDeleteHolding(item.id)}
                      aria-label={`Delete ${item.metal} holding`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
