import { getSupabaseClient } from '@/template';

export interface AnalyticsStats {
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
  pendingRequests: number;
  successRate: number;
  averageResponseTimeHours: number;
}

export interface CreditFlowStats {
  totalCreditsTransferred: number;
  totalTransfers: number;
  averageTransferAmount: number;
  totalGifted: number;
  totalReceived: number;
}

export interface GenerousUser {
  userId: string;
  username: string | null;
  email: string;
  creditsGiven: number;
  transferCount: number;
  requestsApproved: number;
  generosityScore: number;
}

export interface CommunityStats {
  activeUsers: number;
  totalCommunityCredits: number;
  sharingRate: number; // percentage of users who have given credits
  averageCreditsPerUser: number;
}

export interface ResponseTimeStats {
  fastest: number; // in hours
  slowest: number; // in hours
  median: number; // in hours
}

export const creditAnalyticsService = {
  /**
   * Get overall request statistics
   */
  async getRequestStats(userId?: string): Promise<{
    data: AnalyticsStats | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      let query = supabase.from('credit_requests').select('*');
      
      if (userId) {
        query = query.or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
      }

      const { data: requests, error } = await query;

      if (error || !requests) {
        return { data: null, error: error?.message || 'Failed to fetch requests' };
      }

      const total = requests.length;
      const approved = requests.filter(r => r.status === 'approved').length;
      const rejected = requests.filter(r => r.status === 'rejected').length;
      const cancelled = requests.filter(r => r.status === 'cancelled').length;
      const pending = requests.filter(r => r.status === 'pending').length;

      // Calculate average response time for responded requests
      const respondedRequests = requests.filter(r => r.responded_at);
      let avgResponseTime = 0;
      
      if (respondedRequests.length > 0) {
        const totalResponseTime = respondedRequests.reduce((sum, req) => {
          const created = new Date(req.created_at).getTime();
          const responded = new Date(req.responded_at!).getTime();
          return sum + (responded - created);
        }, 0);
        
        avgResponseTime = (totalResponseTime / respondedRequests.length) / (1000 * 60 * 60); // Convert to hours
      }

      const successRate = total > 0 ? (approved / total) * 100 : 0;

      return {
        data: {
          totalRequests: total,
          approvedRequests: approved,
          rejectedRequests: rejected,
          cancelledRequests: cancelled,
          pendingRequests: pending,
          successRate: Math.round(successRate * 10) / 10,
          averageResponseTimeHours: Math.round(avgResponseTime * 10) / 10,
        },
        error: null,
      };
    } catch (err) {
      console.error('Get request stats error:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Get credit flow statistics
   */
  async getCreditFlowStats(userId?: string): Promise<{
    data: CreditFlowStats | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      let query = supabase.from('bundle_transfers').select('*');
      
      if (userId) {
        query = query.or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
      }

      const { data: transfers, error } = await query;

      if (error || !transfers) {
        return { data: null, error: error?.message || 'Failed to fetch transfers' };
      }

      const total = transfers.reduce((sum, t) => sum + t.credits_transferred, 0);
      const count = transfers.length;
      const average = count > 0 ? total / count : 0;

      let gifted = 0;
      let received = 0;

      if (userId) {
        gifted = transfers
          .filter(t => t.from_user_id === userId)
          .reduce((sum, t) => sum + t.credits_transferred, 0);
        
        received = transfers
          .filter(t => t.to_user_id === userId)
          .reduce((sum, t) => sum + t.credits_transferred, 0);
      }

      return {
        data: {
          totalCreditsTransferred: total,
          totalTransfers: count,
          averageTransferAmount: Math.round(average * 10) / 10,
          totalGifted: gifted,
          totalReceived: received,
        },
        error: null,
      };
    } catch (err) {
      console.error('Get credit flow stats error:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Get most generous users leaderboard
   */
  async getGenerousUsersLeaderboard(limit: number = 10): Promise<{
    data: GenerousUser[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      // Get all transfers
      const { data: transfers, error: transfersError } = await supabase
        .from('bundle_transfers')
        .select('from_user_id, credits_transferred');

      if (transfersError) {
        return { data: null, error: transfersError.message };
      }

      // Get all approved requests
      const { data: requests, error: requestsError } = await supabase
        .from('credit_requests')
        .select('recipient_id, credits_requested, status')
        .eq('status', 'approved');

      if (requestsError) {
        return { data: null, error: requestsError.message };
      }

      // Aggregate by user
      const userStats = new Map<string, {
        creditsGiven: number;
        transferCount: number;
        requestsApproved: number;
      }>();

      // Add transfer stats
      transfers?.forEach(transfer => {
        const current = userStats.get(transfer.from_user_id) || {
          creditsGiven: 0,
          transferCount: 0,
          requestsApproved: 0,
        };
        current.creditsGiven += transfer.credits_transferred;
        current.transferCount += 1;
        userStats.set(transfer.from_user_id, current);
      });

      // Add request approval stats
      requests?.forEach(request => {
        const current = userStats.get(request.recipient_id) || {
          creditsGiven: 0,
          transferCount: 0,
          requestsApproved: 0,
        };
        current.creditsGiven += request.credits_requested;
        current.requestsApproved += 1;
        userStats.set(request.recipient_id, current);
      });

      // Get user details for top users
      const userIds = Array.from(userStats.keys());
      if (userIds.length === 0) {
        return { data: [], error: null };
      }

      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, username, email')
        .in('id', userIds);

      if (usersError) {
        return { data: null, error: usersError.message };
      }

      // Combine data and calculate generosity score
      const leaderboard: GenerousUser[] = users.map(user => {
        const stats = userStats.get(user.id)!;
        // Generosity score: credits given + (transfers * 10) + (requests approved * 5)
        const generosityScore = stats.creditsGiven + (stats.transferCount * 10) + (stats.requestsApproved * 5);

        return {
          userId: user.id,
          username: user.username,
          email: user.email,
          creditsGiven: stats.creditsGiven,
          transferCount: stats.transferCount,
          requestsApproved: stats.requestsApproved,
          generosityScore,
        };
      });

      // Sort by generosity score and limit
      leaderboard.sort((a, b) => b.generosityScore - a.generosityScore);

      return {
        data: leaderboard.slice(0, limit),
        error: null,
      };
    } catch (err) {
      console.error('Get generous users error:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Get community statistics
   */
  async getCommunityStats(): Promise<{
    data: CommunityStats | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      // Get all users with bundles
      const { data: bundles, error: bundlesError } = await supabase
        .from('workshop_bundles')
        .select('user_id, total_credits');

      if (bundlesError) {
        return { data: null, error: bundlesError.message };
      }

      // Get all users who have given credits
      const { data: transfers, error: transfersError } = await supabase
        .from('bundle_transfers')
        .select('from_user_id');

      if (transfersError) {
        return { data: null, error: transfersError.message };
      }

      const uniqueUsers = new Set(bundles?.map(b => b.user_id) || []);
      const activeUsers = uniqueUsers.size;

      const totalCredits = bundles?.reduce((sum, b) => sum + b.total_credits, 0) || 0;
      const avgCredits = activeUsers > 0 ? totalCredits / activeUsers : 0;

      const uniqueGivers = new Set(transfers?.map(t => t.from_user_id) || []);
      const sharingRate = activeUsers > 0 ? (uniqueGivers.size / activeUsers) * 100 : 0;

      return {
        data: {
          activeUsers,
          totalCommunityCredits: totalCredits,
          sharingRate: Math.round(sharingRate * 10) / 10,
          averageCreditsPerUser: Math.round(avgCredits * 10) / 10,
        },
        error: null,
      };
    } catch (err) {
      console.error('Get community stats error:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Get response time statistics
   */
  async getResponseTimeStats(): Promise<{
    data: ResponseTimeStats | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      const { data: requests, error } = await supabase
        .from('credit_requests')
        .select('created_at, responded_at')
        .not('responded_at', 'is', null);

      if (error || !requests) {
        return { data: null, error: error?.message || 'Failed to fetch requests' };
      }

      if (requests.length === 0) {
        return {
          data: {
            fastest: 0,
            slowest: 0,
            median: 0,
          },
          error: null,
        };
      }

      // Calculate response times in hours
      const responseTimes = requests.map(req => {
        const created = new Date(req.created_at).getTime();
        const responded = new Date(req.responded_at!).getTime();
        return (responded - created) / (1000 * 60 * 60); // Convert to hours
      });

      responseTimes.sort((a, b) => a - b);

      const fastest = responseTimes[0];
      const slowest = responseTimes[responseTimes.length - 1];
      const medianIndex = Math.floor(responseTimes.length / 2);
      const median = responseTimes[medianIndex];

      return {
        data: {
          fastest: Math.round(fastest * 10) / 10,
          slowest: Math.round(slowest * 10) / 10,
          median: Math.round(median * 10) / 10,
        },
        error: null,
      };
    } catch (err) {
      console.error('Get response time stats error:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Get user's rank in leaderboard
   */
  async getUserRank(userId: string): Promise<{
    rank: number | null;
    totalUsers: number;
    error: string | null;
  }> {
    const { data: leaderboard, error } = await this.getGenerousUsersLeaderboard(1000);

    if (error || !leaderboard) {
      return { rank: null, totalUsers: 0, error };
    }

    const userIndex = leaderboard.findIndex(u => u.userId === userId);
    const rank = userIndex >= 0 ? userIndex + 1 : null;

    return {
      rank,
      totalUsers: leaderboard.length,
      error: null,
    };
  },

  /**
   * Get badge for user based on their generosity
   */
  getBadge(generosityScore: number): {
    name: string;
    icon: string;
    color: string;
    description: string;
  } {
    if (generosityScore >= 500) {
      return {
        name: 'Legendary Supporter',
        icon: '👑',
        color: '#f59e0b',
        description: 'Exceptional community contributor',
      };
    } else if (generosityScore >= 300) {
      return {
        name: 'Super Generous',
        icon: '⭐',
        color: '#3b82f6',
        description: 'Outstanding sharing spirit',
      };
    } else if (generosityScore >= 150) {
      return {
        name: 'Community Hero',
        icon: '🎖️',
        color: '#8b5cf6',
        description: 'Active community supporter',
      };
    } else if (generosityScore >= 50) {
      return {
        name: 'Helpful Friend',
        icon: '🤝',
        color: '#10b981',
        description: 'Sharing and caring',
      };
    } else if (generosityScore >= 10) {
      return {
        name: 'Getting Started',
        icon: '🌱',
        color: '#6b7280',
        description: 'New to sharing',
      };
    } else {
      return {
        name: 'Newcomer',
        icon: '✨',
        color: '#9ca3af',
        description: 'Just joined the community',
      };
    }
  },
};
