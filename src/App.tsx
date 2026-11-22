import {
  Bell,
  Briefcase,
  LineChart,
  LogIn,
  LogOut,
  RefreshCw,
  TrendingUp,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AlertsView } from './components/AlertsView';
import { CurrencyConverter } from './components/CurrencyConverter';
import { IndiaBullionPanel } from './components/IndiaBullionPanel';
import { MarketHistoryChart } from './components/MarketHistoryChart';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PortfolioView } from './components/PortfolioView';
import { PriceHeroCards } from './components/PriceHeroCards';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useAlerts } from './hooks/useAlerts';
import { useAuth } from './hooks/useAuth';
import { useMarketData } from './hooks/useMarketData';
import { usePortfolio } from './hooks/usePortfolio';
import type { CurrencyType, MetalType, NavTab, TimeRange, WeightUnit } from './types/market';
import { convertSpotPrice, formatCurrency, INDIA_CITIES, unitLabel } from './utils/bullionMath';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'markets', label: 'Markets', icon: TrendingUp },
  { id: 'analysis', label: 'Analysis', icon: LineChart },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'alerts', label: 'Alerts', icon: Bell },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('markets');
  const [selectedMetal, setSelectedMetal] = useState<MetalType>('GOLD');
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1Y');

  const {
    user,
    profileReady,
    preferences,
    authError,
    signingIn,
    signInWithGoogle,
    logout,
    savePreferences,
  } = useAuth();

  const {
    liveData,
    liveLoading,
    syncing,
    liveError,
    refreshLive,
    historyData,
    historyLoading,
    historyError,
  } = useMarketData(selectedMetal, selectedRange);

  const {
    holdings,
    loading: holdingsLoading,
    addHolding,
    removeHolding,
  } = usePortfolio(user?.uid ?? null, profileReady);

  const {
    alerts,
    loading: alertsLoading,
    banners,
    createAlert,
    toggleAlert,
    removeAlert,
    dismissBanner,
  } = useAlerts(
    user?.uid ?? null,
    profileReady,
    liveData,
    preferences.includeIndiaTaxes,
    preferences.indiaCity
  );

  const activeAlertCount = useMemo(
    () => alerts.filter((a) => a.status === 'active').length,
    [alerts]
  );

  const currency = preferences.preferredCurrency;
  const goldUnit: WeightUnit =
    currency === 'USD' && preferences.preferredUnit === '10g'
      ? 'oz'
      : preferences.preferredUnit;
  const silverUnit: WeightUnit =
    currency === 'INR'
      ? preferences.preferredUnit === '10g'
        ? 'kg'
        : preferences.preferredUnit
      : 'oz';
  const chartUnit: WeightUnit = selectedMetal === 'GOLD' ? goldUnit : silverUnit;

  const handleCurrencySwitch = (nextCurrency: CurrencyType) => {
    const nextUnit: WeightUnit = nextCurrency === 'INR' ? '10g' : 'oz';
    void savePreferences({ preferredCurrency: nextCurrency, preferredUnit: nextUnit });
  };

  const handleQuickAlert = (metal: MetalType) => {
    setSelectedMetal(metal);
    setActiveTab('alerts');
  };

  const updatedLabel = useMemo(() => {
    if (!liveData?.updatedAt) return 'Syncing...';
    const d = new Date(liveData.updatedAt);
    return `Updated ${d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`;
  }, [liveData?.updatedAt]);

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F1F5F9] flex flex-col">
      {/* Three-Zone Top Bar */}
      <header className="sticky top-0 z-30 h-14 bg-[#0B0D11]/90 backdrop-blur-md border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('markets')}
            className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-lg"
          >
            Aurum<span className="text-[#D4AF37]">Pulse</span>
          </button>

          {/* Zone 2: Desktop Single-Line Navigation Links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative min-h-[40px] text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === 'alerts' && activeAlertCount > 0 && (
                    <span className="ml-1.5 font-mono text-xs text-[#D4AF37]">
                      {activeAlertCount}
                    </span>
                  )}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-[9px] h-[2px] bg-[#D4AF37]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Account / Install Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton compact />
            {user ? (
              <button
                type="button"
                onClick={() => void logout()}
                title={`Signed in as ${user.displayName ?? user.email ?? 'User'} — click to sign out`}
                className="inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-xl border border-white/[0.1] bg-[#131720] text-xs font-medium text-slate-200 hover:border-white/[0.22] transition-colors whitespace-nowrap shrink-0"
              >
                <span className="max-w-[96px] truncate">
                  {user.displayName?.split(' ')[0] ?? 'Account'}
                </span>
                <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void signInWithGoogle()}
                className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-xl bg-[#D4AF37] text-[#0B0D11] text-xs font-semibold hover:bg-[#E5BE52] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>{signingIn ? 'Signing in...' : 'Sign in'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Triggered Alert Notification Toasts */}
      {banners.length > 0 && (
        <div
          aria-live="polite"
          className="fixed top-16 right-4 z-50 w-[calc(100%-2rem)] max-w-sm space-y-2"
        >
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="rounded-xl bg-[#161B26] border border-[#D4AF37]/50 p-4 shadow-2xl flex items-start justify-between gap-3"
            >
              <div>
                <div className="text-xs font-semibold text-[#F2D06B]">{banner.title}</div>
                <p className="mt-1 text-xs text-slate-200 leading-relaxed">{banner.body}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissBanner(banner.id)}
                aria-label="Dismiss alert notification"
                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12 space-y-5">
        {/* Workspace Toolbar: Currency, Unit & Refresh */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Currency Segmented Toggle */}
            <div className="inline-flex items-center rounded-xl bg-[#131720] p-1 border border-white/[0.08]">
              {(['INR', 'USD'] as CurrencyType[]).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => handleCurrencySwitch(curr)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    currency === curr
                      ? 'bg-[#D4AF37] text-[#0B0D11]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {curr === 'INR' ? 'INR ₹' : 'USD $'}
                </button>
              ))}
            </div>

            {/* Weight Unit Selector */}
            <div className="inline-flex items-center rounded-xl bg-[#131720] p-1 border border-white/[0.08]">
              {(['10g', '1g', 'oz', 'kg'] as WeightUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => void savePreferences({ preferredUnit: u })}
                  className={`min-h-[36px] px-2.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap shrink-0 ${
                    preferences.preferredUnit === u
                      ? 'bg-white/[0.12] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {unitLabel(u)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="font-mono tabular-nums">
              {updatedLabel}
              {liveData ? ` · USD/INR ${liveData.usdToInr.toFixed(2)}` : ''}
            </span>
            <button
              type="button"
              onClick={() => void refreshLive(true)}
              aria-label="Refresh bullion prices"
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-white/[0.08] bg-[#131720] text-xs font-medium text-slate-200 hover:border-white/[0.2] transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#D4AF37]' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {(liveError || authError) && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-xs text-rose-200">
            {authError ?? liveError}
          </div>
        )}

        {/* Active View Content */}
        {activeTab === 'markets' && (
          <div className="space-y-5">
            <PriceHeroCards
              liveData={liveData}
              loading={liveLoading}
              currency={currency}
              goldUnit={goldUnit}
              silverUnit={silverUnit}
              includeIndiaTaxes={preferences.includeIndiaTaxes}
              indiaCity={preferences.indiaCity}
              selectedMetal={selectedMetal}
              onSelectMetal={setSelectedMetal}
              onQuickAlert={handleQuickAlert}
            />

            <MarketHistoryChart
              metal={selectedMetal}
              range={selectedRange}
              onRangeChange={setSelectedRange}
              onMetalChange={setSelectedMetal}
              historyData={historyData}
              loading={historyLoading}
              error={historyError}
              currency={currency}
              unit={chartUnit}
              usdToInr={liveData?.usdToInr ?? 84.65}
              includeIndiaTaxes={preferences.includeIndiaTaxes}
              indiaCity={preferences.indiaCity}
              goldSilverRatio={liveData?.goldSilverRatio ?? 0}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <IndiaBullionPanel
                liveData={liveData}
                city={preferences.indiaCity}
                includeIndiaTaxes={preferences.includeIndiaTaxes}
                onCityChange={(city) => void savePreferences({ indiaCity: city })}
                onToggleTaxes={(include) => void savePreferences({ includeIndiaTaxes: include })}
              />
              <CurrencyConverter
                liveData={liveData}
                includeIndiaTaxes={preferences.includeIndiaTaxes}
                indiaCity={preferences.indiaCity}
              />
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-5">
            <MarketHistoryChart
              metal={selectedMetal}
              range={selectedRange}
              onRangeChange={setSelectedRange}
              onMetalChange={setSelectedMetal}
              historyData={historyData}
              loading={historyLoading}
              error={historyError}
              currency={currency}
              unit={chartUnit}
              usdToInr={liveData?.usdToInr ?? 84.65}
              includeIndiaTaxes={preferences.includeIndiaTaxes}
              indiaCity={preferences.indiaCity}
              goldSilverRatio={liveData?.goldSilverRatio ?? 0}
            />

            {/* Cross-City India Benchmark Matrix */}
            {liveData && (
              <section className="rounded-2xl bg-[#131720] border border-white/[0.08] overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      India Regional Bullion Comparison
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Indicative landed 24K Gold (10g), 22K Gold (10g), and 999 Silver (1kg) across
                      major hubs
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Spot XAU {formatCurrency(liveData.gold.priceUsdOz, 'USD')}/oz · XAG{' '}
                    {formatCurrency(liveData.silver.priceUsdOz, 'USD')}/oz
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-xs text-slate-400">
                        <th className="py-3 px-5 font-medium">City</th>
                        <th className="py-3 px-4 font-medium text-right">Gold 24K / 10g</th>
                        <th className="py-3 px-4 font-medium text-right">Gold 22K / 10g</th>
                        <th className="py-3 px-5 font-medium text-right">Silver 999 / 1kg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] text-sm">
                      {INDIA_CITIES.map((c) => {
                        const g24 = convertSpotPrice({
                          priceUsdOz: liveData.gold.priceUsdOz,
                          usdToInr: liveData.usdToInr,
                          currency: 'INR',
                          unit: '10g',
                          purity: '24K',
                          includeIndiaTaxes: preferences.includeIndiaTaxes,
                          city: c,
                          metal: 'GOLD',
                        });
                        const g22 = convertSpotPrice({
                          priceUsdOz: liveData.gold.priceUsdOz,
                          usdToInr: liveData.usdToInr,
                          currency: 'INR',
                          unit: '10g',
                          purity: '22K',
                          includeIndiaTaxes: preferences.includeIndiaTaxes,
                          city: c,
                          metal: 'GOLD',
                        });
                        const s999 = convertSpotPrice({
                          priceUsdOz: liveData.silver.priceUsdOz,
                          usdToInr: liveData.usdToInr,
                          currency: 'INR',
                          unit: 'kg',
                          purity: '999',
                          includeIndiaTaxes: preferences.includeIndiaTaxes,
                          city: c,
                          metal: 'SILVER',
                        });

                        return (
                          <tr
                            key={c}
                            onClick={() => void savePreferences({ indiaCity: c })}
                            className={`cursor-pointer transition-colors hover:bg-white/[0.03] ${
                              preferences.indiaCity === c ? 'bg-white/[0.04]' : ''
                            }`}
                          >
                            <td className="py-3.5 px-5 font-medium text-white">
                              {c}
                              {preferences.indiaCity === c && (
                                <span className="ml-2 text-xs text-[#D4AF37]">Selected</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-white">
                              {formatCurrency(g24, 'INR', 0)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300">
                              {formatCurrency(g22, 'INR', 0)}
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono tabular-nums text-slate-200">
                              {formatCurrency(s999, 'INR', 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <CurrencyConverter
              liveData={liveData}
              includeIndiaTaxes={preferences.includeIndiaTaxes}
              indiaCity={preferences.indiaCity}
            />
          </div>
        )}

        {activeTab === 'portfolio' && (
          <PortfolioView
            holdings={holdings}
            loading={holdingsLoading}
            liveData={liveData}
            displayCurrency={currency}
            includeIndiaTaxes={preferences.includeIndiaTaxes}
            indiaCity={preferences.indiaCity}
            isSignedIn={Boolean(user)}
            onSignIn={() => void signInWithGoogle()}
            onAddHolding={addHolding}
            onDeleteHolding={removeHolding}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView
            alerts={alerts}
            loading={alertsLoading}
            liveData={liveData}
            defaultMetal={selectedMetal}
            displayCurrency={currency}
            includeIndiaTaxes={preferences.includeIndiaTaxes}
            indiaCity={preferences.indiaCity}
            isSignedIn={Boolean(user)}
            onSignIn={() => void signInWithGoogle()}
            onCreateAlert={createAlert}
            onToggleAlert={toggleAlert}
            onDeleteAlert={removeAlert}
            onNotificationsOptIn={(enabled) =>
              void savePreferences({ notificationsEnabled: enabled })
            }
          />
        )}
      </main>

      {/* Ergonomic Mobile Bottom Navigation Bar (Natural Thumb Zone, Compact Height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0D11]/95 backdrop-blur-md border-t border-white/[0.08] pb-safe"
      >
        <div className="grid grid-cols-4 h-14">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                  active ? 'text-[#D4AF37]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="mt-0.5 text-[10px] font-medium tracking-tight">
                  {item.label}
                </span>
                {item.id === 'alerts' && activeAlertCount > 0 && (
                  <span className="absolute top-1.5 right-4 text-[10px] font-mono font-bold text-[#D4AF37]">
                    {activeAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <OfflineIndicator />
    </div>
  );
}
