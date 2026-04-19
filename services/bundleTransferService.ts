import { getSupabaseClient } from '@/template';
import { workshopBundleService } from './workshopBundleService';

export interface BundleTransfer {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_bundle_id: string;
  to_bundle_id: string | null;
  credits_transferred: number;
  transferred_at: string;
  transfer_message: string | null;
}

export const bundleTransferService = {
  /**
   * Validate recipient email and get user ID
   */
  async validateRecipient(email: string): Promise<{
    valid: boolean;
    userId: string | null;
    username: string | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const cleanEmail = email.toLowerCase().trim();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, email')
      .eq('email', cleanEmail)
      .single();

    if (error || !data) {
      return { 
        valid: false, 
        userId: null,
        username: null,
        error: 'No user found with this email address. Please check and try again.' 
      };
    }

    return { 
      valid: true, 
      userId: data.id,
      username: data.username || null,
      error: null 
    };
  },

  /**
   * Transfer credits from one user to another
   */
  async transferCredits(
    fromUserId: string,
    toUserId: string,
    credits: number,
    message?: string
  ): Promise<{
    success: boolean;
    transferId: string | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    try {
      // Validation: Can't transfer to yourself
      if (fromUserId === toUserId) {
        return { 
          success: false, 
          transferId: null, 
          error: 'You cannot transfer credits to yourself.' 
        };
      }

      // Validation: Credits must be positive
      if (credits <= 0) {
        return { 
          success: false, 
          transferId: null, 
          error: 'Transfer amount must be greater than 0.' 
        };
      }

      // Get sender's bundles with available credits
      const { data: senderBundles } = await supabase
        .from('workshop_bundles')
        .select('*')
        .eq('user_id', fromUserId)
        .gt('remaining_credits', 0)
        .order('created_at', { ascending: true });

      if (!senderBundles || senderBundles.length === 0) {
        return { 
          success: false, 
          transferId: null, 
          error: 'You have no available credits to transfer.' 
        };
      }

      // Calculate total available credits
      const totalAvailable = senderBundles.reduce((sum, bundle) => sum + bundle.remaining_credits, 0);
      
      if (totalAvailable < credits) {
        return { 
          success: false, 
          transferId: null, 
          error: `You only have ${totalAvailable} credits available. Cannot transfer ${credits} credits.` 
        };
      }

      // Deduct credits from sender's bundles (FIFO - oldest first)
      let remainingToDeduct = credits;
      let fromBundleId = '';
      
      for (const bundle of senderBundles) {
        if (remainingToDeduct <= 0) break;
        
        const deductAmount = Math.min(remainingToDeduct, bundle.remaining_credits);
        
        const { error: deductError } = await supabase
          .from('workshop_bundles')
          .update({
            used_credits: bundle.used_credits + deductAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bundle.id);

        if (deductError) {
          throw new Error(`Failed to deduct credits: ${deductError.message}`);
        }

        if (!fromBundleId) {
          fromBundleId = bundle.id; // Track first bundle for transfer record
        }

        remainingToDeduct -= deductAmount;
      }

      // Check if recipient has existing bundles
      const { data: recipientBundles } = await supabase
        .from('workshop_bundles')
        .select('*')
        .eq('user_id', toUserId)
        .order('created_at', { ascending: false })
        .limit(1);

      let toBundleId: string | null = null;

      if (recipientBundles && recipientBundles.length > 0) {
        // Add to most recent bundle
        const latestBundle = recipientBundles[0];
        
        const { error: addError } = await supabase
          .from('workshop_bundles')
          .update({
            total_credits: latestBundle.total_credits + credits,
            updated_at: new Date().toISOString(),
          })
          .eq('id', latestBundle.id);

        if (addError) {
          throw new Error(`Failed to add credits to recipient: ${addError.message}`);
        }

        toBundleId = latestBundle.id;
      } else {
        // Create new bundle for recipient
        const { data: newBundle, error: createError } = await supabase
          .from('workshop_bundles')
          .insert({
            user_id: toUserId,
            bundle_type: '3_pack', // Generic type for transferred credits
            total_credits: credits,
            used_credits: 0,
            original_price: 0,
            discounted_price: 0,
            discount_percent: 0,
            payment_intent_id: `transfer_${new Date().getTime()}`,
          })
          .select()
          .single();

        if (createError || !newBundle) {
          throw new Error(`Failed to create bundle for recipient: ${createError?.message}`);
        }

        toBundleId = newBundle.id;
      }

      // Record the transfer
      const { data: transfer, error: transferError } = await supabase
        .from('bundle_transfers')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          from_bundle_id: fromBundleId,
          to_bundle_id: toBundleId,
          credits_transferred: credits,
          transfer_message: message || null,
        })
        .select()
        .single();

      if (transferError || !transfer) {
        throw new Error(`Failed to record transfer: ${transferError?.message}`);
      }

      return { 
        success: true, 
        transferId: transfer.id, 
        error: null 
      };
    } catch (err) {
      console.error('Transfer credits error:', err);
      return { 
        success: false, 
        transferId: null, 
        error: String(err) 
      };
    }
  },

  /**
   * Get user's sent transfers
   */
  async getSentTransfers(userId: string): Promise<{
    data: BundleTransfer[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('bundle_transfers')
      .select('*')
      .eq('from_user_id', userId)
      .order('transferred_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BundleTransfer[], error: null };
  },

  /**
   * Get user's received transfers
   */
  async getReceivedTransfers(userId: string): Promise<{
    data: BundleTransfer[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('bundle_transfers')
      .select('*')
      .eq('to_user_id', userId)
      .order('transferred_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BundleTransfer[], error: null };
  },

  /**
   * Get transfer details with user information
   */
  async getTransferDetails(transferId: string): Promise<{
    data: any | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('bundle_transfers')
      .select(`
        *,
        from_user:user_profiles!bundle_transfers_from_user_id_fkey(id, username, email),
        to_user:user_profiles!bundle_transfers_to_user_id_fkey(id, username, email)
      `)
      .eq('id', transferId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  },
};
