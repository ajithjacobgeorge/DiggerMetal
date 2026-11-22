export type MetalType = 'GOLD' | 'SILVER';
export type CurrencyType = 'INR' | 'USD';
export type WeightUnit = '10g' | '1g' | 'oz' | 'kg';
export type HoldingUnit = 'g' | '10g' | 'oz' | 'kg';
export type PurityGrade = '24K' | '22K' | '18K' | '999';
export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';
export type IndiaCity = 'Mumbai' | 'Delhi' | 'Chennai' | 'Bengaluru' | 'Kolkata' | 'Hyderabad';
export type AlertCondition = 'ABOVE' | 'BELOW';
export type AlertStatus = 'active' | 'paused' | 'triggered';
export type NavTab = 'markets' | 'analysis' | 'portfolio' | 'alerts';

export interface LiveMetalQuote {
  symbol: string;
  priceUsdOz: number;
  prevCloseUsdOz: number;
  changeUsdOz: number;
  changePct: number;
  dayHighUsdOz: number;
  dayLowUsdOz: number;
  fiftyTwoWeekHighUsdOz: number;
  fiftyTwoWeekLowUsdOz: number;
  source: string;
}

export interface LiveMarketData {
  gold: LiveMetalQuote;
  silver: LiveMetalQuote;
  usdToInr: number;
  goldSilverRatio: number;
  updatedAt: string;
  dataMode: 'live' | 'cached' | 'reference';
}

export interface HistoryPoint {
  timestamp: number;
  date: string;
  openUsdOz: number;
  highUsdOz: number;
  lowUsdOz: number;
  closeUsdOz: number;
}

export interface MarketHistoryResponse {
  metal: MetalType;
  range: TimeRange;
  usdToInr: number;
  points: HistoryPoint[];
  updatedAt: string;
  source: string;
}

export interface UserPreferences {
  userId: string;
  displayName: string;
  preferredCurrency: CurrencyType;
  preferredUnit: WeightUnit;
  indiaCity: IndiaCity;
  includeIndiaTaxes: boolean;
  notificationsEnabled: boolean;
}

export interface PortfolioHolding {
  id: string;
  userId: string;
  metal: MetalType;
  purity: PurityGrade;
  quantity: number;
  unit: HoldingUnit;
  buyPrice: number;
  currency: CurrencyType;
  purchaseDate: string;
  label: string;
}

export interface PriceAlert {
  id: string;
  userId: string;
  metal: MetalType;
  condition: AlertCondition;
  targetPrice: number;
  currency: CurrencyType;
  unit: WeightUnit;
  status: AlertStatus;
  note: string;
  triggeredPrice: number;
}
