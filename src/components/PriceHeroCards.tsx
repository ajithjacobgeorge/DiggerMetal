import { BellPlus, TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';
import type { CurrencyType, IndiaCity, LiveMarketData, MetalType, WeightUnit } from '../types/market';
import { convertSpotPrice, formatCurrency, formatSignedPct, unitLabel } from '../utils/bullionMath';

interface PriceHeroCardsProps {
  liveData: LiveMarketData | null;
  loading: boolean;
  currency: CurrencyType;
  goldUnit: WeightUnit;
  silverUnit: WeightUnit;
  includeIndiaTaxes: boolean;
  indiaCity: IndiaCity;
  selectedMetal: MetalType;
  onSelectMetal: (metal: MetalType) => void;
  onQuickAlert: (metal: MetalType) => void;
}

export const PriceHeroCards: React.FC<PriceHeroCardsProps> = ({
  liveData,
  loading,
  currency,
  goldUnit,
  silverUnit,
  includeIndiaTaxes,
  indiaCity,
  selectedMetal,
  onSelectMetal,
  onQuickAlert,
}) => {
  if (loading && !liveData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-[#131720] border border-white/[0.08] p-5 sm:p-6 animate-pulse"
          >
            <div className="h-4 w-28 bg-white/10 rounded" />
            <div className="mt-4 h-9 w-48 bg-white/10 rounded" />
            <div className="mt-3 h-4 w-36 bg-white/5 rounded" />
            <div className="mt-6 h-2 w-full bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!liveData) return null;

  const cards: Array<{
    metal: MetalType;
    title: string;
    subtitle: string;
    unit: WeightUnit;
    accentColor: string;
    activeBorder: string;
    quote: LiveMarketData['gold'];
  }> = [
    {
      metal: 'GOLD',
      title: 'Gold',
      subtitle: currency === 'INR' ? `24K (999) · ${indiaCity}` : 'Spot XAU / USD',
      unit: goldUnit,
      accentColor: '#D4AF37',
      activeBorder: 'border-[#D4AF37]/60 bg-[#151A24]',
      quote: liveData.gold,
    },
    {
      metal: 'SILVER',
      title: 'Silver',
      subtitle: currency === 'INR' ? `Fine 999 · ${indiaCity}` : 'Spot XAG / USD',
      unit: silverUnit,
      accentColor: '#CBD5E1',
      activeBorder: 'border-slate-300/50 bg-[#151A24]',
      quote: liveData.silver,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card) => {
        const isSelected = selectedMetal === card.metal;
        const price = convertSpotPrice({
          priceUsdOz: card.quote.priceUsdOz,
          usdToInr: liveData.usdToInr,
          currency,
          unit: card.unit,
          purity: card.metal === 'GOLD' ? '24K' : '999',
          includeIndiaTaxes,
          city: indiaCity,
          metal: card.metal,
        });

        const prevPrice = convertSpotPrice({
          priceUsdOz: card.quote.prevCloseUsdOz,
          usdToInr: liveData.usdToInr,
          currency,
          unit: card.unit,
          purity: card.metal === 'GOLD' ? '24K' : '999',
          includeIndiaTaxes,
          city: indiaCity,
          metal: card.metal,
        });

        const low52 = convertSpotPrice({
          priceUsdOz: card.quote.fiftyTwoWeekLowUsdOz,
          usdToInr: liveData.usdToInr,
          currency,
          unit: card.unit,
          purity: card.metal === 'GOLD' ? '24K' : '999',
          includeIndiaTaxes,
          city: indiaCity,
          metal: card.metal,
        });

        const high52 = convertSpotPrice({
          priceUsdOz: card.quote.fiftyTwoWeekHighUsdOz,
          usdToInr: liveData.usdToInr,
          currency,
          unit: card.unit,
          purity: card.metal === 'GOLD' ? '24K' : '999',
          includeIndiaTaxes,
          city: indiaCity,
          metal: card.metal,
        });

        const delta = price - prevPrice;
        const isUp = delta >= 0;
        const rangeSpan = Math.max(high52 - low52, 0.01);
        const posPct = Math.min(100, Math.max(0, ((price - low52) / rangeSpan) * 100));

        // Secondary quick reference (22K for Gold in INR, or USD spot parity)
        const secondaryLabel =
          card.metal === 'GOLD' && currency === 'INR'
            ? `22K (916): ${formatCurrency(
                convertSpotPrice({
                  priceUsdOz: card.quote.priceUsdOz,
                  usdToInr: liveData.usdToInr,
                  currency: 'INR',
                  unit: card.unit,
                  purity: '22K',
                  includeIndiaTaxes,
                  city: indiaCity,
                  metal: 'GOLD',
                }),
                'INR'
              )}`
            : currency === 'INR'
            ? `Global Spot: ${formatCurrency(card.quote.priceUsdOz, 'USD')}/oz`
            : `India Landed: ${formatCurrency(
                convertSpotPrice({
                  priceUsdOz: card.quote.priceUsdOz,
                  usdToInr: liveData.usdToInr,
                  currency: 'INR',
                  unit: card.metal === 'GOLD' ? '10g' : 'kg',
                  purity: card.metal === 'GOLD' ? '24K' : '999',
                  includeIndiaTaxes,
                  city: indiaCity,
                  metal: card.metal,
                }),
                'INR'
              )}/${card.metal === 'GOLD' ? '10g' : '1kg'}`;

        return (
          <div
            key={card.metal}
            role="button"
            tabIndex={0}
            onClick={() => onSelectMetal(card.metal)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectMetal(card.metal);
              }
            }}
            className={`group text-left rounded-2xl border p-5 sm:p-6 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
              isSelected
                ? card.activeBorder
                : 'border-white/[0.08] bg-[#131720] hover:border-white/[0.16]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: card.accentColor }}
                    aria-hidden="true"
                  />
                  <h2 className="text-lg font-semibold text-white tracking-tight">{card.title}</h2>
                  <span className="text-xs font-mono text-slate-400">
                    {card.quote.symbol}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {card.subtitle}
                  <span aria-hidden="true"> · </span>
                  per {unitLabel(card.unit)}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAlert(card.metal);
                }}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-white/[0.1] bg-[#0B0D11]/60 text-xs font-medium text-slate-200 hover:border-[#D4AF37]/50 hover:text-[#F2D06B] transition-colors whitespace-nowrap shrink-0"
              >
                <BellPlus className="w-3.5 h-3.5 shrink-0" />
                <span>Set alert</span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-mono tabular-nums text-3xl sm:text-4xl font-semibold text-white tracking-tight">
                {formatCurrency(price, currency)}
              </div>

              <div
                className={`inline-flex items-center gap-1 font-mono tabular-nums text-sm font-medium ${
                  isUp ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isUp ? (
                  <TrendingUp className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : (
                  <TrendingDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {isUp ? '+' : ''}
                  {formatCurrency(delta, currency, currency === 'INR' ? 0 : 2)}
                </span>
                <span className="text-slate-500" aria-hidden="true">
                  /
                </span>
                <span>{formatSignedPct(card.quote.changePct)}</span>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
              <span>{secondaryLabel}</span>
              <span className="text-slate-500">{isSelected ? 'Chart active' : 'Tap for chart'}</span>
            </div>

            {/* 52-Week Range Indicator */}
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                <span>52W Low {formatCurrency(low52, currency, currency === 'INR' ? 0 : 2)}</span>
                <span>52W High {formatCurrency(high52, currency, currency === 'INR' ? 0 : 2)}</span>
              </div>
              <div className="mt-2 relative h-1.5 w-full rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${posPct}%`,
                    backgroundColor: card.accentColor,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
