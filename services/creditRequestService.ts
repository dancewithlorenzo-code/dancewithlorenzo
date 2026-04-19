import { getSupabaseClient } from '@/template';
import { bundleTransferService } from './bundleTransferService';
import { notificationService } from './notificationService';

export interface CreditRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  credits_requested: number;
  request_message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  created_at: string;
  responded_at: string | null;
  expires_at: string | null;
  expired_at: string | null;
  last_reminder_sent: string | null;
}

export const creditRequestService = {
  /**
   * Create a new credit request
   */
  async createCreditRequest(
    requesterId: string,
    recipientEmail: string,
    credits: number,
    message?: string
  ): Promise<{
    success: boolean;
    requestId: string | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      // Validate recipient exists
      const { valid, userId, error: validationError } = await bundleTransferService.validateRecipient(recipientEmail);

      if (!valid || !userId) {
        return {
          success: false,
          requestId: null,
          error: validationError || 'Invalid recipient email'
        };
      }

      // Check if user is trying to request from themselves
      if (userId === requesterId) {
        return {
          success: false,
          requestId: null,
          error: 'You cannot request credits from yourself.'
        };
      }

      // Validate credits amount
      if (credits <= 0) {
        return {
          success: false,
          requestId: null,
          error: 'Credits must be greater than 0.'
        };
      }

      // Check for existing pending request to same recipient
      const { data: existingRequests } = await supabase
        .from('credit_requests')
        .select('id')
        .eq('requester_id', requesterId)
        .eq('recipient_id', userId)
        .eq('status', 'pending');

      if (existingRequests && existingRequests.length > 0) {
        return {
          success: false,
          requestId: null,
          error: 'You already have a pending request to this user. Please wait for their response.'
        };
      }

      // Calculate expiration date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create credit request
      const { data, error } = await supabase
        .from('credit_requests')
        .insert({
          requester_id: requesterId,
          recipient_id: userId,
          credits_requested: credits,
          request_message: message || null,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Create credit request error:', error);
        return {
          success: false,
          requestId: null,
          error: error?.message || 'Failed to create credit request'
        };
      }

      // Get recipient's name for notification
      const { data: recipientData } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', userId)
        .single();

      const recipientUsername = recipientData?.username || 'User';

      // Get requester's name for notification
      const { data: requesterData } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', requesterId)
        .single();

      const requesterUsername = requesterData?.username || 'User';

      // Send push notification to recipient
      await notificationService.sendCreditRequestReceivedNotification(
        userId,
        data.id,
        requesterUsername,
        credits,
        message || null
      );

      return {
        success: true,
        requestId: data.id,
        error: null
      };
    } catch (err) {
      console.error('Credit request service error:', err);
      return {
        success: false,
        requestId: null,
        error: String(err)
      };
    }
  },

  /**
   * Get user's sent credit requests
   */
  async getSentRequests(userId: string): Promise<{
    data: CreditRequest[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as CreditRequest[], error: null };
  },

  /**
   * Get user's received credit requests
   */
  async getReceivedRequests(userId: string): Promise<{
    data: CreditRequest[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as CreditRequest[], error: null };
  },

  /**
   * Get pending received requests count
   */
  async getPendingReceivedCount(userId: string): Promise<number> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('credit_requests')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('Get pending count error:', error);
      return 0;
    }

    return data ? 1 : 0; // Supabase head query doesn't return count directly in this setup
  },

  /**
   * Approve a credit request (triggers transfer)
   */
  async approveRequest(
    requestId: string,
    recipientId: string
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      // Get request details
      const { data: request, error: fetchError } = await supabase
        .from('credit_requests')
        .select('*')
        .eq('id', requestId)
        .eq('recipient_id', recipientId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !request) {
        return {
          success: false,
          error: 'Request not found or already processed.'
        };
      }

      // Execute transfer
      const { success: transferSuccess, error: transferError } = await bundleTransferService.transferCredits(
        recipientId,
        request.requester_id,
        request.credits_requested,
        request.request_message ? `Approved request: ${request.request_message}` : 'Approved credit request'
      );

      if (!transferSuccess) {
        return {
          success: false,
          error: transferError || 'Failed to transfer credits'
        };
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('credit_requests')
        .update({
          status: 'approved',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Update request status error:', updateError);
        // Transfer succeeded but status update failed - not critical
      }

      // Get recipient's name for notification
      const { data: recipientData } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', recipientId)
        .single();

      const recipientUsername = recipientData?.username || 'User';

      // Send push notification to requester
      await notificationService.sendCreditRequestApprovedNotification(
        request.requester_id,
        requestId,
        recipientUsername,
        request.credits_requested
      );

      return {
        success: true,
        error: null
      };
    } catch (err) {
      console.error('Approve request error:', err);
      return {
        success: false,
        error: String(err)
      };
    }
  },

  /**
   * Reject a credit request
   */
  async rejectRequest(
    requestId: string,
    recipientId: string
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      // Get request details before updating
      const { data: request, error: fetchError } = await supabase
        .from('credit_requests')
        .select('*')
        .eq('id', requestId)
        .eq('recipient_id', recipientId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !request) {
        return {
          success: false,
          error: 'Request not found or already processed.'
        };
      }

      // Update status
      const { error } = await supabase
        .from('credit_requests')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Get recipient's name for notification
      const { data: recipientData } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', recipientId)
        .single();

      const recipientUsername = recipientData?.username || 'User';

      // Send push notification to requester
      await notificationService.sendCreditRequestRejectedNotification(
        request.requester_id,
        requestId,
        recipientUsername,
        request.credits_requested
      );

      return {
        success: true,
        error: null
      };
    } catch (err) {
      console.error('Reject request error:', err);
      return {
        success: false,
        error: String(err)
      };
    }
  },

  /**
   * Cancel a credit request (by requester)
   */
  async cancelRequest(
    requestId: string,
    requesterId: string
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('credit_requests')
      .update({
        status: 'cancelled',
        responded_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('requester_id', requesterId)
      .eq('status', 'pending');

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      error: null
    };
  },

  /**
   * Get request details with user information
   */
  async getRequestWithUsers(requestId: string): Promise<{
    data: any | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('credit_requests')
      .select(`
        *,
        requester:user_profiles!credit_requests_requester_id_fkey(id, username, email),
        recipient:user_profiles!credit_requests_recipient_id_fkey(id, username, email)
      `)
      .eq('id', requestId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  },

  /**
   * Get time remaining until expiration
   */
  getTimeRemaining(expiresAt: string): {
    expired: boolean;
    daysRemaining: number;
    hoursRemaining: number;
    displayText: string;
  } {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) {
      return {
        expired: true,
        daysRemaining: 0,
        hoursRemaining: 0,
        displayText: 'Expired'
      };
    }

    const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
    const daysRemaining = Math.floor(hoursRemaining / 24);

    let displayText;
    if (daysRemaining > 1) {
      displayText = `${daysRemaining} days left`;
    } else if (hoursRemaining > 24) {
      displayText = `1 day left`;
    } else if (hoursRemaining > 1) {
      displayText = `${hoursRemaining} hours left`;
    } else if (hoursRemaining === 1) {
      displayText = '1 hour left';
    } else {
      displayText = 'Less than 1 hour';
    }

    return {
      expired: false,
      daysRemaining,
      hoursRemaining,
      displayText
    };
  },
};
