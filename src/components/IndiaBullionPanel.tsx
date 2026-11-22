import { MapPin } from 'lucide-react';
import React from 'react';
import type { IndiaCity, LiveMarketData } from '../types/market';
import {
  convertSpotPrice,
  formatCurrency,
  INDIA_CITIES,
  INDIA_CITY_SPREAD,
} from '../utils/bullionMath';

interface IndiaBullionPanelProps {
  liveData: LiveMarketData | null;
  city: IndiaCity;
  includeIndiaTaxes: boolean;
  onCityChange: (city: IndiaCity) => void;
  onToggleTaxes: (include: boolean) => void;
}

export const IndiaBullionPanel: React.FC<IndiaBullionPanelProps> = ({
  liveData,
  city,
  includeIndiaTaxes,
  onCityChange,
  onToggleTaxes,
}) => {
  if (!liveData) return null;

  const gold24k10g = convertSpotPrice({
    priceUsdOz: liveData.gold.priceUsdOz,
    usdToInr: liveData.usdToInr,
    currency: 'INR',
    unit: '10g',
    purity: '24K',
    includeIndiaTaxes,
    city,
    metal: 'GOLD',
  });

  const gold22k10g = convertSpotPrice({
    priceUsdOz: liveData.gold.priceUsdOz,
    usdToInr: liveData.usdToInr,
    currency: 'INR',
    unit: '10g',
    purity: '22K',
    includeIndiaTaxes,
    city,
    metal: 'GOLD',
  });

  const gold18k10g = convertSpotPrice({
    priceUsdOz: liveData.gold.priceUsdOz,
    usdToInr: liveData.usdToInr,
    currency: 'INR',
    unit: '10g',
    purity: '18K',
    includeIndiaTaxes,
    city,
    metal: 'GOLD',
  });

  const silver999Kg = convertSpotPrice({
    priceUsdOz: liveData.silver.priceUsdOz,
    usdToInr: liveData.usdToInr,
    currency: 'INR',
    unit: 'kg',
    purity: '999',
    includeIndiaTaxes,
    city,
    metal: 'SILVER',
  });

  const rows = [
    {
      name: 'Gold 24K (999 Bullion)',
      perUnit: formatCurrency(gold24k10g, 'INR', 0),
      unitTag: '10g',
      perGram: formatCurrency(gold24k10g / 10, 'INR', 0),
      gramTag: '1g',
    },
    {
      name: 'Gold 22K (916 Jewellery)',
      perUnit: formatCurrency(gold22k10g, 'INR', 0),
      unitTag: '10g',
      perGram: formatCurrency(gold22k10g / 10, 'INR', 0),
      gramTag: '1g',
    },
    {
      name: 'Gold 18K (750 Fine)',
      perUnit: formatCurrency(gold18k10g, 'INR', 0),
      unitTag: '10g',
      perGram: formatCurrency(gold18k10g / 10, 'INR', 0),
      gramTag: '1g',
    },
    {
      name: 'Silver 999 (Chandi)',
      perUnit: formatCurrency(silver999Kg, 'INR', 0),
      unitTag: '1kg',
      perGram: formatCurrency(silver999Kg / 100, 'INR', 0),
      gramTag: '10g',
    },
  ];

  return (
    <section className="rounded-2xl bg-[#131720] border border-white/[0.08] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">India Bullion Rates</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {INDIA_CITY_SPREAD[city].hub}
            <span aria-hidden="true"> · </span>
            USD/INR {liveData.usdToInr.toFixed(2)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleTaxes(!includeIndiaTaxes)}
          className={`min-h-[40px] px-3 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            includeIndiaTaxes
              ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#F2D06B]'
              : 'border-white/[0.1] bg-[#0B0D11] text-slate-300 hover:text-white'
          }`}
        >
          {includeIndiaTaxes ? 'Incl. 6% Duty + 3% GST' : 'Ex-Tax Spot Parity'}
        </button>
      </div>

      {/* City Selector */}
      <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
        {INDIA_CITIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onCityChange(c)}
            className={`inline-flex items-center gap-1 min-h-[38px] px-3 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              city === c
                ? 'bg-white/[0.12] text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {city === c && <MapPin className="w-3 h-3 text-[#D4AF37]" aria-hidden="true" />}
            <span>{c}</span>
          </button>
        ))}
      </div>

      {/* Purity Rates Table */}
      <div className="mt-4 divide-y divide-white/[0.06]">
        {rows.map((row) => (
          <div
            key={row.name}
            className="py-3.5 flex items-center justify-between gap-4"
          >
            <div>
              <div className="text-sm font-medium text-slate-100">{row.name}</div>
              <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                {row.perGram} / {row.gramTag}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono tabular-nums text-base font-semibold text-white">
                {row.perUnit}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">per {row.unitTag}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
        Derived from live XAU/XAG spot and USD/INR FX rates
        {includeIndiaTaxes
          ? ' with India Customs & AIDC (6%), bullion import basis, and 3% GST.'
          : ' at pure international parity without local taxes.'}
      </p>
    </section>
  );
};
