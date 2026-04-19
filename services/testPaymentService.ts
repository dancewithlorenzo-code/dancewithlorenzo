import { getSupabaseClient } from '@/template';

export const testPaymentService = {
  /**
   * Create a ¥100 test checkout session to verify Stripe live mode
   */
  async createTestCheckout(userId: string): Promise<{ url: string | null; error: string | null }> {
    try {
      const supabase = getSupabaseClient();

      console.log('🧪 Creating ¥100 test payment for user:', userId);

      const { data, error } = await supabase.functions.invoke('create-test-checkout', {
        body: { user_id: userId },
      });

      if (error) {
        console.error('❌ Test payment error:', error);
        
        // Enhanced error handling for FunctionsHttpError
        let errorMessage = error.message || 'Failed to create test payment';
        
        if (error.context) {
          try {
            const statusCode = error.context.status ?? 500;
            const textContent = await error.context.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = error.message || 'Failed to read error details';
          }
        }
        
        return { url: null, error: errorMessage };
      }

      if (!data?.url) {
        return { url: null, error: 'No checkout URL returned' };
      }

      console.log('✅ Test payment URL created:', data.url);
      return { url: data.url, error: null };
    } catch (error) {
      console.error('❌ Unexpected error in createTestCheckout:', error);
      return { 
        url: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    }
  },
};
