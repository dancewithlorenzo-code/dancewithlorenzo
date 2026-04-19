// Manual Payment Service (Stripe Disabled)
// All payment processing is now manual - students pay cash/bank transfer

export const stripeService = {
  /**
   * Get workshop price based on current participants
   * Tiered pricing: ¥15,000 for <5 participants, ¥12,000 for 5+ participants
   */
  getWorkshopPrice(currentParticipants: number): number {
    return currentParticipants < 5 ? 15000 : 12000;
  },

  // Placeholder methods - Manual payment mode
  async createTokenCheckoutSession(userId: string) {
    return {
      url: null,
      error: 'Manual Payment: Please show bank transfer details instead',
    };
  },

  async createWorkshopCheckoutSession(userId: string, classId: string) {
    return {
      url: null,
      bookingId: null,
      amount: null,
      priceTier: null,
      error: 'Manual Payment: Cash or bank transfer only',
    };
  },

  async createPrivateLessonCheckout(userId: string, lessonId: string) {
    return {
      paymentUrl: null,
      error: 'Manual Payment: Instructor will provide payment details',
    };
  },

  async createWorkshopBundleCheckout(userId: string, bundleType: '3_pack' | '5_pack' | '7_pack') {
    return {
      url: null,
      error: 'Manual Payment: Contact instructor for bundle purchase',
    };
  },

  async createGiftCardCheckout(
    purchaserId: string,
    recipientEmail: string,
    recipientName: string | undefined,
    bundleType: '3_pack' | '5_pack' | '7_pack',
    customMessage: string | undefined
  ) {
    return {
      url: null,
      error: 'Manual Payment: Contact instructor for gift cards',
    };
  },

  async createTestCheckout(userId: string) {
    return {
      url: null,
      error: 'Test payments disabled in manual mode',
    };
  },
};
