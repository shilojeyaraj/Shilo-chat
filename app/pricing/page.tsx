'use client';

import React, { useEffect, Suspense } from 'react';
import { Check, Zap, Crown, Rocket, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getUsageData, getMessageLimit, updateSubscription } from '@/lib/utils/usage-tracker';
import { useSearchParams } from 'next/navigation';

const PLANS = [
  {
    name: 'Plus',
    tier: 'plus',
    price: '$9.99',
    period: 'month',
    description: 'Perfect for regular users who need more than the free tier',
    longDescription: 'Ideal for students, hobbyists, and professionals who use AI chat regularly. Get 4x more messages than the free tier, plus priority support and advanced features to supercharge your productivity.',
    icon: <Zap className="w-6 h-6" />,
    color: 'blue',
    features: [
      '100 messages per day (4x free tier)',
      'Priority support',
      'Advanced code assistance',
      'Extended context window',
      'All free features',
    ],
    popular: false,
  },
  {
    name: 'Premium',
    tier: 'premium',
    price: '$19.99',
    period: 'month',
    description: 'For power users and professionals who need serious AI assistance',
    longDescription: 'Designed for developers, content creators, and professionals who rely on AI daily. With 500 messages per day, custom system prompts, and upcoming API access, you\'ll have everything you need to work at peak efficiency.',
    icon: <Crown className="w-6 h-6" />,
    color: 'purple',
    features: [
      '500 messages per day (20x free tier)',
      'Priority support',
      'Advanced code assistance',
      'Extended context window',
      'Custom system prompts',
      'API access (coming soon)',
      'All Plus features',
    ],
    popular: true,
  },
];

function PricingContent() {
  const searchParams = useSearchParams();
  const [usage, setUsage] = React.useState(getUsageData());
  const currentLimit = getMessageLimit();

  // Handle highlighted plan
  useEffect(() => {
    const highlight = searchParams?.get('highlight') as 'plus' | 'premium' | null;
    
    // Scroll to highlighted plan if specified
    if (highlight) {
      setTimeout(() => {
        const element = document.getElementById(`plan-${highlight}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a highlight animation
          element.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
          }, 3000);
        }
      }, 100);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">
              Shilo Chat
            </Link>
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Chat
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Upgrade to unlock more messages and advanced features. All plans include access to all AI models.
          </p>
        </div>

        {/* Current Usage */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Your Current Usage</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400">Current Tier</div>
                <div className="text-xl font-semibold capitalize">{usage.subscriptionTier}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Daily Messages</div>
                <div className="text-xl font-semibold">
                  {usage.dailyMessages} / {currentLimit === Infinity ? '∞' : currentLimit}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Total Messages</div>
                <div className="text-xl font-semibold">{usage.totalMessages}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <div
              id={`plan-${plan.tier}`}
              key={plan.tier}
              className={`relative bg-gray-800 rounded-xl p-6 border-2 transition-all ${
                plan.popular
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20 scale-105'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${
                  plan.color === 'blue' ? 'bg-blue-600/20 text-blue-400' :
                  plan.color === 'purple' ? 'bg-purple-600/20 text-purple-400' :
                  'bg-yellow-600/20 text-yellow-400'
                }`}>
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-2">{plan.description}</p>
                <p className="text-gray-500 text-xs mb-4 leading-relaxed">{plan.longDescription}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400">/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  // Simple manual upgrade - just update the subscription locally
                  const endDate = new Date();
                  endDate.setDate(endDate.getDate() + 30);
                  
                  updateSubscription(plan.tier as 'plus' | 'premium', 'active', endDate.toISOString());
                  setUsage(getUsageData());
                  
                  alert(`✅ Successfully upgraded to ${plan.name} plan!\n\nYou now have access to all ${plan.name} features.`);
                  window.location.href = '/';
                }}
                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : plan.color === 'blue'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }`}
              >
                Upgrade to {plan.name}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Free Tier Info */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-2">Free Tier</h3>
            <p className="text-gray-400 text-sm mb-4">
              Get started with 10 messages per day. Perfect for trying out the platform.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-400" />
              <span>Access to all AI models</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm mt-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>File uploads and analysis</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm mt-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>Personal information storage</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="font-semibold mb-2">How does the daily message limit work?</h3>
              <p className="text-sm text-gray-400">
                Your message count resets at midnight (your local time). Each message you send counts toward your daily limit.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="font-semibold mb-2">Can I upgrade or downgrade anytime?</h3>
              <p className="text-sm text-gray-400">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="font-semibold mb-2">What happens if I cancel my subscription?</h3>
              <p className="text-sm text-gray-400">
                You'll retain access to your plan until the end of your billing period, then revert to the free tier.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}

