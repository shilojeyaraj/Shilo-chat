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

const FREE_TIER_LIMIT = 10; // messages per day (lowered for testing)

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
 * Check if user can send messages (hasn't hit limit)
 */
export function canSendMessage(): boolean {
  const usage = getUsageData();
  
  // Check subscription status
  if (usage.subscriptionTier !== 'free' && usage.subscriptionStatus === 'active') {
    // Check if subscription is still valid
    if (usage.subscriptionEndDate) {
      const endDate = new Date(usage.subscriptionEndDate);
      if (endDate < new Date()) {
        // Subscription expired, revert to free tier
        const updatedUsage = {
          ...usage,
          subscriptionTier: 'free' as const,
          subscriptionStatus: null,
          subscriptionEndDate: null,
        };
        saveUsageData(updatedUsage);
        return updatedUsage.dailyMessages < FREE_TIER_LIMIT;
      }
    }
    // Active subscription: check tier limits
    const limit = getMessageLimit();
    return usage.dailyMessages < limit;
  }

  // Free tier: check daily limit
  return usage.dailyMessages < FREE_TIER_LIMIT;
}

/**
 * Get remaining messages for today
 */
export function getRemainingMessages(): number {
  const usage = getUsageData();
  
  if (usage.subscriptionTier !== 'free' && usage.subscriptionStatus === 'active') {
    return Infinity; // Unlimited for paid tiers
  }

  return Math.max(0, FREE_TIER_LIMIT - usage.dailyMessages);
}

/**
 * Get message limit for current tier
 */
export function getMessageLimit(): number {
  const usage = getUsageData();
  
  if (usage.subscriptionTier === 'plus') return 100; // Plus tier: 100/day
  if (usage.subscriptionTier === 'premium') return 500; // Premium tier: 500/day
  
  return FREE_TIER_LIMIT; // Free tier: 10/day
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

