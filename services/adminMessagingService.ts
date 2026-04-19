import { getSupabaseClient } from '@/template';

export interface AdminMessage {
  id: string;
  sender_id: string;
  subject: string;
  body: string;
  recipient_filter: RecipientFilter;
  recipient_ids: string[];
  recipient_emails: string[];
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  error_message?: string;
  created_at: string;
  sent_at?: string;
}

export type RecipientFilter = 
  | 'all' 
  | 'active_students' 
  | 'boutique_customers' 
  | 'music_customers' 
  | 'workshop_participants'
  | 'token_holders';

export interface RecipientGroup {
  filter: RecipientFilter;
  label: string;
  description: string;
}

const supabase = getSupabaseClient();

export const RECIPIENT_GROUPS: RecipientGroup[] = [
  {
    filter: 'all',
    label: 'All Users',
    description: 'Send to everyone registered in the system',
  },
  {
    filter: 'active_students',
    label: 'Active Students',
    description: 'Users who have attended classes in the last 30 days',
  },
  {
    filter: 'boutique_customers',
    label: 'Boutique Customers',
    description: 'Users who have purchased boutique items',
  },
  {
    filter: 'music_customers',
    label: 'Music Customers',
    description: 'Users who have purchased music products',
  },
  {
    filter: 'workshop_participants',
    label: 'Workshop Participants',
    description: 'Users who have booked workshop classes',
  },
  {
    filter: 'token_holders',
    label: 'Token Holders',
    description: 'Users who currently have tokens or bundles',
  },
];

// Get recipients based on filter
export async function getRecipientsByFilter(filter: RecipientFilter): Promise<{ id: string; email: string }[]> {
  try {
    let recipients: { id: string; email: string }[] = [];

    switch (filter) {
      case 'all':
        const { data: allUsers } = await supabase
          .from('user_profiles')
          .select('id, email')
          .neq('is_admin', true);
        recipients = allUsers || [];
        break;

      case 'active_students':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: activeStudents } = await supabase
          .from('check_ins')
          .select('user_id, user_profiles(id, email)')
          .gte('created_at', thirtyDaysAgo.toISOString());
        
        const uniqueActive = new Map<string, { id: string; email: string }>();
        activeStudents?.forEach(checkin => {
          if (checkin.user_profiles) {
            uniqueActive.set(checkin.user_profiles.id, checkin.user_profiles);
          }
        });
        recipients = Array.from(uniqueActive.values());
        break;

      case 'boutique_customers':
        const { data: boutiqueOrders } = await supabase
          .from('boutique_orders')
          .select('user_id, user_profiles(id, email)');
        
        const uniqueBoutique = new Map<string, { id: string; email: string }>();
        boutiqueOrders?.forEach(order => {
          if (order.user_profiles) {
            uniqueBoutique.set(order.user_profiles.id, order.user_profiles);
          }
        });
        recipients = Array.from(uniqueBoutique.values());
        break;

      case 'music_customers':
        const { data: musicPurchases } = await supabase
          .from('music_purchases')
          .select('user_id, user_profiles(id, email)');
        
        const uniqueMusic = new Map<string, { id: string; email: string }>();
        musicPurchases?.forEach(purchase => {
          if (purchase.user_profiles) {
            uniqueMusic.set(purchase.user_profiles.id, purchase.user_profiles);
          }
        });
        recipients = Array.from(uniqueMusic.values());
        break;

      case 'workshop_participants':
        const { data: bookings } = await supabase
          .from('bookings')
          .select('user_id, user_profiles(id, email)');
        
        const uniqueWorkshop = new Map<string, { id: string; email: string }>();
        bookings?.forEach(booking => {
          if (booking.user_profiles) {
            uniqueWorkshop.set(booking.user_profiles.id, booking.user_profiles);
          }
        });
        recipients = Array.from(uniqueWorkshop.values());
        break;

      case 'token_holders':
        const { data: tokenHolders } = await supabase
          .from('tokens')
          .select('user_id, user_profiles(id, email)')
          .gt('remaining_tokens', 0);
        
        const { data: bundleHolders } = await supabase
          .from('workshop_bundles')
          .select('user_id, user_profiles(id, email)')
          .gt('remaining_credits', 0);
        
        const uniqueTokens = new Map<string, { id: string; email: string }>();
        tokenHolders?.forEach(token => {
          if (token.user_profiles) {
            uniqueTokens.set(token.user_profiles.id, token.user_profiles);
          }
        });
        bundleHolders?.forEach(bundle => {
          if (bundle.user_profiles) {
            uniqueTokens.set(bundle.user_profiles.id, bundle.user_profiles);
          }
        });
        recipients = Array.from(uniqueTokens.values());
        break;
    }

    return recipients;
  } catch (error) {
    console.error('Error getting recipients:', error);
    return [];
  }
}

// Create draft message
export async function createDraftMessage(
  senderId: string,
  subject: string,
  body: string,
  recipientFilter: RecipientFilter
): Promise<{ data: AdminMessage | null; error: string | null }> {
  try {
    // Get recipients
    const recipients = await getRecipientsByFilter(recipientFilter);

    const { data, error } = await supabase
      .from('admin_messages')
      .insert({
        sender_id: senderId,
        subject,
        body,
        recipient_filter: recipientFilter,
        recipient_ids: recipients.map(r => r.id),
        recipient_emails: recipients.map(r => r.email),
        total_recipients: recipients.length,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    console.error('Error creating draft:', error);
    return { data: null, error: error.message };
  }
}

// Send message
export async function sendMessage(messageId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-admin-message', {
      body: { messageId },
    });

    if (error) {
      console.error('Send message error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Send message error:', error);
    return { success: false, error: error.message };
  }
}

// Get all messages
export async function getAdminMessages(): Promise<{ data: AdminMessage[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('admin_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return { data: [], error: error.message };
  }
}

// Delete draft message
export async function deleteDraftMessage(messageId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('admin_messages')
      .delete()
      .eq('id', messageId)
      .eq('status', 'draft');

    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    return { success: false, error: error.message };
  }
}
