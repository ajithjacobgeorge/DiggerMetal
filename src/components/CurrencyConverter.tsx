import { ArrowLeftRight } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { IndiaCity, LiveMarketData, MetalType, PurityGrade, WeightUnit } from '../types/market';
import { convertSpotPrice, formatCurrency, unitLabel } from '../utils/bullionMath';

interface CurrencyConverterProps {
  liveData: LiveMarketData | null;
  includeIndiaTaxes: boolean;
  indiaCity: IndiaCity;
}

type ConverterMode = 'BULLION' | 'FX';

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  liveData,
  includeIndiaTaxes,
  indiaCity,
}) => {
  const [mode, setMode] = useState<ConverterMode>('BULLION');
  const [metal, setMetal] = useState<MetalType>('GOLD');
  const [purity, setPurity] = useState<PurityGrade>('24K');
  const [weight, setWeight] = useState<string>('10');
  const [unit, setUnit] = useState<WeightUnit>('1g');

  // FX direct mode
  const [fxAmount, setFxAmount] = useState<string>('100000');
  const [fxFrom, setFxFrom] = useState<'INR' | 'USD'>('INR');

  const fxRate = liveData?.usdToInr ?? 84.65;

  const bullionCalc = useMemo(() => {
    if (!liveData) return null;
    const qty = Math.max(0, Number(weight) || 0);
    const spot = metal === 'GOLD' ? liveData.gold.priceUsdOz : liveData.silver.priceUsdOz;
    const effectivePurity: PurityGrade = metal === 'SILVER' ? '999' : purity;

    const unitPriceInr = convertSpotPrice({
      priceUsdOz: spot,
      usdToInr: fxRate,
      currency: 'INR',
      unit,
      purity: effectivePurity,
      includeIndiaTaxes,
      city: indiaCity,
      metal,
    });

    const unitPriceUsd = convertSpotPrice({
      priceUsdOz: spot,
      usdToInr: fxRate,
      currency: 'USD',
      unit,
      purity: effectivePurity,
      includeIndiaTaxes: false,
      city: indiaCity,
      metal,
    });

    const pureSpotInr = unitPriceUsd * fxRate;
    const indiaSpreadPct =
      pureSpotInr > 0 ? ((unitPriceInr - pureSpotInr) / pureSpotInr) * 100 : 0;

    return {
      totalInr: unitPriceInr * qty,
      totalUsd: unitPriceUsd * qty,
      totalPureInr: pureSpotInr * qty,
      indiaSpreadPct,
    };
  }, [liveData, weight, metal, purity, fxRate, unit, includeIndiaTaxes, indiaCity]);

  const fxConverted = useMemo(() => {
    const val = Math.max(0, Number(fxAmount) || 0);
    return fxFrom === 'INR' ? val / fxRate : val * fxRate;
  }, [fxAmount, fxFrom, fxRate]);

  return (
    <section className="rounded-2xl bg-[#131720] border border-white/[0.08] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">INR ↔ USD Converter</h3>
          <p className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
            1 USD = ₹{fxRate.toFixed(2)}
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-[#0B0D11] p-1 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setMode('BULLION')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'BULLION' ? 'bg-white/[0.12] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bullion Parity
          </button>
          <button
            type="button"
            onClick={() => setMode('FX')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'FX' ? 'bg-white/[0.12] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Direct FX
          </button>
        </div>
      </div>

      {mode === 'BULLION' ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="conv-metal" className="block text-xs text-slate-400 mb-1.5">
                Metal
              </label>
              <select
                id="conv-metal"
                value={metal}
                onChange={(e) => {
                  const m = e.target.value as MetalType;
                  setMetal(m);
                  if (m === 'SILVER') setPurity('999');
                  else if (purity === '999') setPurity('24K');
                }}
                className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="GOLD">Gold (XAU)</option>
                <option value="SILVER">Silver (XAG)</option>
              </select>
            </div>

            <div>
              <label htmlFor="conv-purity" className="block text-xs text-slate-400 mb-1.5">
                Purity
              </label>
              <select
                id="conv-purity"
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
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3">
              <label htmlFor="conv-weight" className="block text-xs text-slate-400 mb-1.5">
                Quantity
              </label>
              <input
                id="conv-weight"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 font-mono tabular-nums text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="conv-unit" className="block text-xs text-slate-400 mb-1.5">
                Unit
              </label>
              <select
                id="conv-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as WeightUnit)}
                className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="1g">Grams (g)</option>
                <option value="10g">10 Grams</option>
                <option value="oz">Troy Oz</option>
                <option value="kg">Kilogram</option>
              </select>
            </div>
          </div>

          {bullionCalc && (
            <div className="pt-4 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400">
                  India ({indiaCity}) {includeIndiaTaxes ? 'Landed' : 'Spot'}
                </div>
                <div className="mt-1 font-mono tabular-nums text-xl font-semibold text-[#F2D06B]">
                  {formatCurrency(bullionCalc.totalInr, 'INR', 0)}
                </div>
                {includeIndiaTaxes && (
                  <div className="mt-0.5 text-[11px] font-mono text-slate-400">
                    +{bullionCalc.indiaSpreadPct.toFixed(1)}% duty/GST over spot
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs text-slate-400">International Spot (USD)</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-semibold text-white">
                  {formatCurrency(bullionCalc.totalUsd, 'USD', 2)}
                </div>
                <div className="mt-0.5 text-[11px] font-mono text-slate-400">
                  Raw FX parity: {formatCurrency(bullionCalc.totalPureInr, 'INR', 0)}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="fx-input" className="block text-xs text-slate-400 mb-1.5">
                Amount ({fxFrom})
              </label>
              <input
                id="fx-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={fxAmount}
                onChange={(e) => setFxAmount(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0B0D11] border border-white/[0.1] px-3 font-mono tabular-nums text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button
              type="button"
              onClick={() => setFxFrom((prev) => (prev === 'INR' ? 'USD' : 'INR'))}
              aria-label="Swap INR and USD direction"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#0B0D11] border border-white/[0.1] text-slate-200 hover:border-[#D4AF37]/50 hover:text-[#F2D06B] transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-4 border-t border-white/[0.06]">
            <div className="text-xs text-slate-400">
              Converted ({fxFrom === 'INR' ? 'USD' : 'INR'})
            </div>
            <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-white">
              {formatCurrency(fxConverted, fxFrom === 'INR' ? 'USD' : 'INR', 2)}
            </div>
            {liveData && (
              <div className="mt-2 text-xs text-slate-400 font-mono tabular-nums">
                Buys approx.{' '}
                {(
                  (fxFrom === 'INR' ? Number(fxAmount) || 0 : fxConverted) /
                  Math.max(
                    convertSpotPrice({
                      priceUsdOz: liveData.gold.priceUsdOz,
                      usdToInr: fxRate,
                      currency: 'INR',
                      unit: '1g',
                      purity: '24K',
                      includeIndiaTaxes,
                      city: indiaCity,
                      metal: 'GOLD',
                    }),
                    1
                  )
                ).toFixed(2)}
                g of 24K Gold ({unitLabel('1g')} rate)
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
