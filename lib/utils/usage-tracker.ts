/**
 * Usage tracking for message limits and pricing tiers
 */

export interface UsageData {
  dailyMessages: number;
  lastResetDate: string; // YYYY-MM-DD format
  totalMessages: number;
  subscriptionTier: 'free' | 'plus' | 'premium';
  subscriptionStatus: 'active' | 'canceled' | 'expired' | null;
  subscriptionEndDate: string | null;
}

/**
 * Get current usage data from localStorage
 */
export function getUsageData(): UsageData {
  if (typeof window === 'undefined') {
    return getDefaultUsageData();
  }

  const stored = localStorage.getItem('usageData');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      // Check if we need to reset daily count
      const today = new Date().toISOString().split('T')[0];
      if (data.lastResetDate !== today) {
        // Reset daily count for new day
        return {
          ...data,
          dailyMessages: 0,
          lastResetDate: today,
        };
      }
      return data;
    } catch (error) {
      console.error('Failed to parse usage data:', error);
    }
  }

  return getDefaultUsageData();
}

/**
 * Get default usage data
 */
function getDefaultUsageData(): UsageData {
  return {
    dailyMessages: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    totalMessages: 0,
    subscriptionTier: 'free',
    subscriptionStatus: null,
    subscriptionEndDate: null,
  };
}

/**
 * Save usage data to localStorage
 */
export function saveUsageData(data: UsageData): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('usageData', JSON.stringify(data));
  }
}

/**
 * Increment message count
 */
export function incrementMessageCount(): UsageData {
  const usage = getUsageData();
  const today = new Date().toISOString().split('T')[0];

  // Reset if new day
  if (usage.lastResetDate !== today) {
    usage.dailyMessages = 0;
    usage.lastResetDate = today;
  }

  usage.dailyMessages += 1;
  usage.totalMessages += 1;

  saveUsageData(usage);
  return usage;
}

/**
 * Get message limit for current tier (for display; no enforced limit).
 */
export function getMessageLimit(): number {
  return Infinity;
}

/**
 * Update subscription tier (manual upgrade)
 */
export function updateSubscription(
  tier: 'plus' | 'premium',
  status: 'active' | 'canceled' | 'expired',
  endDate: string | null
): void {
  const usage = getUsageData();
  usage.subscriptionTier = tier;
  usage.subscriptionStatus = status;
  usage.subscriptionEndDate = endDate;
  saveUsageData(usage);
}

/**
 * Reset subscription to free tier
 */
export function resetToFreeTier(): void {
  const usage = getUsageData();
  usage.subscriptionTier = 'free';
  usage.subscriptionStatus = null;
  usage.subscriptionEndDate = null;
  saveUsageData(usage);
}

