import { Download, Share, X } from 'lucide-react';
import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-2 min-h-[40px] rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#F2D06B] hover:bg-[#D4AF37]/20 transition-colors whitespace-nowrap shrink-0 text-xs font-semibold ${
          compact ? 'px-3' : 'px-3.5'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center justify-center gap-2 min-h-[40px] px-3 rounded-xl border border-white/[0.12] bg-[#131720] text-slate-200 hover:bg-[#1A202C] transition-colors whitespace-nowrap shrink-0 text-xs font-medium"
        >
          <Share className="w-3.5 h-3.5 shrink-0" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#131720] border border-white/[0.1] p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Install AurumPulse</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                1. Tap the <strong className="text-white">Share</strong> button in Safari.
                <br />
                2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-[#D4AF37] text-[#0B0D11] text-sm font-semibold hover:bg-[#E5BE52] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
