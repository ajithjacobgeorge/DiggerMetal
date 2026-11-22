import type {
  CurrencyType,
  HistoryPoint,
  HoldingUnit,
  IndiaCity,
  MetalType,
  PurityGrade,
  WeightUnit,
} from '../types/market';

export const GRAMS_PER_TROY_OZ = 31.1034768;

// India Bullion Landed Factor (Union Budget 2024 customs + AIDC = 6% + 3% GST + ~0.4% bank/import premium)
export const INDIA_CUSTOMS_AIDC_RATE = 0.06;
export const INDIA_GST_RATE = 0.03;
export const INDIA_BULLION_PREMIUM_RATE = 0.004;

export const PURITY_FACTOR: Record<PurityGrade, number> = {
  '24K': 0.999,
  '22K': 0.9167,
  '18K': 0.75,
  '999': 0.999,
};

// Indicative Indian city bullion basis adjustments (percentage relative to Mumbai IBJA base)
export const INDIA_CITY_SPREAD: Record<IndiaCity, { goldPct: number; silverPct: number; hub: string }> = {
  Mumbai: { goldPct: 0.0, silverPct: 0.0, hub: 'IBJA Zaveri Bazaar' },
  Delhi: { goldPct: 0.0018, silverPct: 0.0022, hub: 'Chandni Chowk Bullion' },
  Chennai: { goldPct: 0.0032, silverPct: 0.0045, hub: 'MBS South Benchmark' },
  Bengaluru: { goldPct: 0.0012, silverPct: 0.0035, hub: 'Avenue Rd Bullion' },
  Kolkata: { goldPct: 0.0008, silverPct: 0.0015, hub: 'Burrabazar Base' },
  Hyderabad: { goldPct: 0.0014, silverPct: 0.004, hub: 'Pot Market Bullion' },
};

export const INDIA_CITIES: IndiaCity[] = [
  'Mumbai',
  'Delhi',
  'Chennai',
  'Bengaluru',
  'Kolkata',
  'Hyderabad',
];

export function unitToGrams(unit: WeightUnit | HoldingUnit): number {
  switch (unit) {
    case '1g':
    case 'g':
      return 1;
    case '10g':
      return 10;
    case 'oz':
      return GRAMS_PER_TROY_OZ;
    case 'kg':
      return 1000;
  }
}

export function getIndiaLandedMultiplier(
  includeIndiaTaxes: boolean,
  city: IndiaCity = 'Mumbai',
  metal: MetalType = 'GOLD'
): number {
  const baseTaxFactor = includeIndiaTaxes
    ? (1 + INDIA_CUSTOMS_AIDC_RATE + INDIA_BULLION_PREMIUM_RATE) * (1 + INDIA_GST_RATE)
    : 1;
  const spread =
    metal === 'GOLD' ? INDIA_CITY_SPREAD[city].goldPct : INDIA_CITY_SPREAD[city].silverPct;
  return baseTaxFactor * (1 + spread);
}

/**
 * Converts international spot price (USD / troy oz) into requested currency, unit, purity,
 * and optional India landed tax/city context.
 */
export function convertSpotPrice(params: {
  priceUsdOz: number;
  usdToInr: number;
  currency: CurrencyType;
  unit: WeightUnit | HoldingUnit;
  purity?: PurityGrade;
  includeIndiaTaxes?: boolean;
  city?: IndiaCity;
  metal?: MetalType;
}): number {
  const {
    priceUsdOz,
    usdToInr,
    currency,
    unit,
    purity = '24K',
    includeIndiaTaxes = true,
    city = 'Mumbai',
    metal = 'GOLD',
  } = params;

  const usdPerGram = priceUsdOz / GRAMS_PER_TROY_OZ;
  const grams = unitToGrams(unit);
  const purityRatio = purity === '24K' || purity === '999' ? 1 : PURITY_FACTOR[purity] / 0.999;

  let value = usdPerGram * grams * purityRatio;
  if (currency === 'INR') {
    value = value * usdToInr * getIndiaLandedMultiplier(includeIndiaTaxes, city, metal);
  }
  return value;
}

export function formatCurrency(value: number, currency: CurrencyType, decimals?: number): string {
  if (!Number.isFinite(value)) return currency === 'INR' ? '₹0' : '$0.00';
  const defaultDecimals = currency === 'INR' ? (value >= 1000 ? 0 : 2) : 2;
  const d = decimals ?? defaultDecimals;

  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(value);
}

export function formatSignedPct(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function unitLabel(unit: WeightUnit | HoldingUnit): string {
  switch (unit) {
    case '10g':
      return '10g';
    case '1g':
    case 'g':
      return '1g';
    case 'oz':
      return 'oz';
    case 'kg':
      return '1kg';
  }
}

export interface TechnicalMetrics {
  periodReturnPct: number;
  periodHigh: number;
  periodLow: number;
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  annualizedVolatilityPct: number | null;
}

export interface ChartDataPoint {
  date: string;
  label: string;
  price: number;
  sma20: number | null;
  sma50: number | null;
}

export function buildChartSeriesAndAnalytics(
  points: HistoryPoint[],
  convertFn: (usdOz: number) => number,
  isIntraday: boolean
): { series: ChartDataPoint[]; metrics: TechnicalMetrics } {
  if (points.length === 0) {
    return {
      series: [],
      metrics: {
        periodReturnPct: 0,
        periodHigh: 0,
        periodLow: 0,
        sma20: null,
        sma50: null,
        rsi14: null,
        annualizedVolatilityPct: null,
      },
    };
  }

  const prices = points.map((p) => convertFn(p.closeUsdOz));
  const series: ChartDataPoint[] = [];

  let sum20 = 0;
  let sum50 = 0;

  for (let i = 0; i < points.length; i++) {
    const val = prices[i];
    sum20 += val;
    sum50 += val;
    if (i >= 20) sum20 -= prices[i - 20];
    if (i >= 50) sum50 -= prices[i - 50];

    const d = new Date(points[i].timestamp);
    const label = isIntraday
      ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

    series.push({
      date: points[i].date,
      label,
      price: Number(val.toFixed(2)),
      sma20: i >= 19 ? Number((sum20 / 20).toFixed(2)) : null,
      sma50: i >= 49 ? Number((sum50 / 50).toFixed(2)) : null,
    });
  }

  const first = prices[0];
  const last = prices[prices.length - 1];
  const periodReturnPct = first > 0 ? ((last - first) / first) * 100 : 0;
  const periodHigh = Math.max(...prices);
  const periodLow = Math.min(...prices);

  // RSI-14 calculation
  let rsi14: number | null = null;
  if (prices.length > 14) {
    let gains = 0;
    let losses = 0;
    const start = Math.max(1, prices.length - 14);
    for (let i = start; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    rsi14 = avgLoss === 0 ? 100 : Number((100 - 100 / (1 + avgGain / avgLoss)).toFixed(1));
  }

  // Annualized volatility (daily log returns)
  let annualizedVolatilityPct: number | null = null;
  if (!isIntraday && prices.length > 10) {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0 && prices[i] > 0) {
        returns.push(Math.log(prices[i] / prices[i - 1]));
      }
    }
    if (returns.length > 5) {
      const mean = returns.reduce((acc, r) => acc + r, 0) / returns.length;
      const variance =
        returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (returns.length - 1);
      annualizedVolatilityPct = Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(1));
    }
  }

  return {
    series,
    metrics: {
      periodReturnPct: Number(periodReturnPct.toFixed(2)),
      periodHigh,
      periodLow,
      sma20: series[series.length - 1]?.sma20 ?? null,
      sma50: series[series.length - 1]?.sma50 ?? null,
      rsi14,
      annualizedVolatilityPct,
    },
  };
}
