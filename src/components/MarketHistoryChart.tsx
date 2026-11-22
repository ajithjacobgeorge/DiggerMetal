import React, { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  CurrencyType,
  IndiaCity,
  MarketHistoryResponse,
  MetalType,
  TimeRange,
  WeightUnit,
} from '../types/market';
import {
  buildChartSeriesAndAnalytics,
  convertSpotPrice,
  formatCurrency,
  formatSignedPct,
  unitLabel,
} from '../utils/bullionMath';

interface MarketHistoryChartProps {
  metal: MetalType;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  onMetalChange: (metal: MetalType) => void;
  historyData: MarketHistoryResponse | null;
  loading: boolean;
  error: string | null;
  currency: CurrencyType;
  unit: WeightUnit;
  usdToInr: number;
  includeIndiaTaxes: boolean;
  indiaCity: IndiaCity;
  goldSilverRatio: number;
}

const RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];

export const MarketHistoryChart: React.FC<MarketHistoryChartProps> = ({
  metal,
  range,
  onRangeChange,
  onMetalChange,
  historyData,
  loading,
  error,
  currency,
  unit,
  usdToInr,
  includeIndiaTaxes,
  indiaCity,
  goldSilverRatio,
}) => {
  const [showSma, setShowSma] = useState(true);

  const strokeColor = metal === 'GOLD' ? '#D4AF37' : '#CBD5E1';
  const gradientId = metal === 'GOLD' ? 'goldAreaGrad' : 'silverAreaGrad';

  const { series, metrics } = useMemo(() => {
    if (!historyData?.points?.length) {
      return buildChartSeriesAndAnalytics([], (x) => x, range === '1D');
    }
    const effectiveFx = usdToInr || historyData.usdToInr || 84.6;
    return buildChartSeriesAndAnalytics(
      historyData.points,
      (usdOz) =>
        convertSpotPrice({
          priceUsdOz: usdOz,
          usdToInr: effectiveFx,
          currency,
          unit,
          purity: metal === 'GOLD' ? '24K' : '999',
          includeIndiaTaxes,
          city: indiaCity,
          metal,
        }),
      range === '1D'
    );
  }, [historyData, usdToInr, currency, unit, metal, includeIndiaTaxes, indiaCity, range]);

  const rsiLabel = useMemo(() => {
    if (metrics.rsi14 === null) return '—';
    if (metrics.rsi14 >= 70) return 'Overbought';
    if (metrics.rsi14 <= 30) return 'Oversold';
    return 'Neutral';
  }, [metrics.rsi14]);

  const isPositive = metrics.periodReturnPct >= 0;

  return (
    <section className="rounded-2xl bg-[#131720] border border-white/[0.08] p-5 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-white">
              {metal === 'GOLD' ? 'Gold' : 'Silver'} Historical Trend
            </h2>
            <span
              className={`font-mono tabular-nums text-sm font-medium ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatSignedPct(metrics.periodReturnPct)} ({range})
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {currency} per {unitLabel(unit)}
            <span aria-hidden="true"> · </span>
            {historyData?.source ?? 'Market Feed'}
            {currency === 'INR' && (
              <>
                <span aria-hidden="true"> · </span>
                {includeIndiaTaxes ? `${indiaCity} landed (incl. duty & 3% GST)` : 'Spot parity (ex-tax)'}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metal Switch */}
          <div className="inline-flex items-center rounded-xl bg-[#0B0D11] p-1 border border-white/[0.06]">
            {(['GOLD', 'SILVER'] as MetalType[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMetalChange(m)}
                className={`min-h-[36px] px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  metal === m
                    ? m === 'GOLD'
                      ? 'bg-[#D4AF37] text-[#0B0D11]'
                      : 'bg-slate-200 text-[#0B0D11]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'GOLD' ? 'Gold' : 'Silver'}
              </button>
            ))}
          </div>

          {/* SMA Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowSma((prev) => !prev)}
            className={`min-h-[40px] px-3 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              showSma
                ? 'border-sky-400/40 bg-sky-500/10 text-sky-300'
                : 'border-white/[0.08] bg-[#0B0D11] text-slate-400 hover:text-white'
            }`}
          >
            SMA 20 / 50
          </button>
        </div>
      </div>

      {/* Timeframe Tabs */}
      <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRangeChange(r)}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 ${
              range === r
                ? 'bg-white/[0.12] text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart Canvas */}
      <div className="mt-4 h-[290px] sm:h-[340px] w-full">
        {loading && series.length === 0 ? (
          <div className="h-full w-full rounded-xl bg-white/[0.02] flex items-center justify-center text-sm text-slate-400">
            Loading {range} market series...
          </div>
        ) : error && series.length === 0 ? (
          <div className="h-full w-full rounded-xl bg-white/[0.02] flex items-center justify-center text-sm text-rose-400">
            {error}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
                minTickGap={34}
              />
              <YAxis
                domain={['auto', 'auto']}
                orientation="right"
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
                width={76}
                tickFormatter={(val: number) =>
                  currency === 'INR'
                    ? `₹${val >= 100000 ? `${(val / 100000).toFixed(2)}L` : Math.round(val).toLocaleString('en-IN')}`
                    : `$${val >= 1000 ? Math.round(val).toLocaleString('en-US') : val.toFixed(1)}`
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const pt = payload[0].payload as (typeof series)[number];
                  return (
                    <div className="rounded-xl bg-[#0B0D11]/95 border border-white/[0.12] px-3.5 py-2.5 shadow-xl">
                      <div className="text-[11px] text-slate-400 font-mono">{pt.label}</div>
                      <div className="mt-1 text-sm font-mono tabular-nums font-semibold text-white">
                        {formatCurrency(pt.price, currency)}
                      </div>
                      {showSma && pt.sma20 !== null && (
                        <div className="mt-1 text-[11px] font-mono tabular-nums text-sky-400">
                          SMA 20: {formatCurrency(pt.sma20, currency)}
                        </div>
                      )}
                      {showSma && pt.sma50 !== null && (
                        <div className="text-[11px] font-mono tabular-nums text-amber-400">
                          SMA 50: {formatCurrency(pt.sma50, currency)}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
              {showSma && (
                <>
                  <Line
                    type="monotone"
                    dataKey="sma20"
                    stroke="#38BDF8"
                    strokeWidth={1.4}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sma50"
                    stroke="#F59E0B"
                    strokeWidth={1.4}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Technical Market Analysis Strip (Unboxed with hairline divider) */}
      <div className="mt-5 pt-5 border-t border-white/[0.06] grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-slate-400">{range} High / Low</div>
          <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-white">
            {formatCurrency(metrics.periodHigh, currency, currency === 'INR' ? 0 : 2)}
          </div>
          <div className="font-mono tabular-nums text-xs text-slate-400">
            Low {formatCurrency(metrics.periodLow, currency, currency === 'INR' ? 0 : 2)}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">50-Period SMA</div>
          <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-white">
            {metrics.sma50 !== null
              ? formatCurrency(metrics.sma50, currency, currency === 'INR' ? 0 : 2)
              : '—'}
          </div>
          <div className="text-xs text-slate-400">
            {metrics.sma20 !== null
              ? `SMA 20: ${formatCurrency(metrics.sma20, currency, currency === 'INR' ? 0 : 2)}`
              : 'Short window'}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">RSI (14) Momentum</div>
          <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-white">
            {metrics.rsi14 !== null ? metrics.rsi14.toFixed(1) : '—'}
          </div>
          <div className="text-xs text-slate-400">{rsiLabel}</div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Gold / Silver Ratio</div>
          <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-white">
            {goldSilverRatio > 0 ? `${goldSilverRatio.toFixed(2)}x` : '—'}
          </div>
          <div className="text-xs text-slate-400">
            {metrics.annualizedVolatilityPct !== null
              ? `Volatility ${metrics.annualizedVolatilityPct}%`
              : 'Intraday session'}
          </div>
        </div>
      </div>
    </section>
  );
};
