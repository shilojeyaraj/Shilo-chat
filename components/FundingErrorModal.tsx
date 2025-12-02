'use client';

import React from 'react';
import { X, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface FundingErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FundingErrorModal({ isOpen, onClose }: FundingErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-2">
            Claude Funding Depleted
          </h2>

          {/* Description */}
          <p className="text-slate-300 text-center mb-6">
            Your Claude API account has run out of credits. You need to add more funding to continue using Claude for image and file analysis.
          </p>

          {/* Instructions */}
          <div className="bg-slate-900/50 rounded-lg p-4 mb-6 space-y-3">
            <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              How to Reload Funding:
            </h3>
            <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
              <li>
                Go to{' '}
                <a
                  href="https://console.anthropic.com/settings/billing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1"
                >
                  Anthropic Console
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Navigate to <strong className="text-slate-200">Settings → Billing</strong></li>
              <li>Click <strong className="text-slate-200">"Add Credits"</strong> or <strong className="text-slate-200">"Top Up"</strong></li>
              <li>Add your payment method and purchase credits</li>
              <li>Wait a few moments for the credits to be applied</li>
              <li>Come back here and try again</li>
            </ol>
          </div>

          {/* Alternative */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-300">
              <strong>Note:</strong> While you reload Claude funding, the system will automatically fall back to other models (like OpenAI GPT-4o) if available for image processing.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
            >
              Got It
            </button>
            <a
              href="https://console.anthropic.com/settings/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              Open Billing
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

