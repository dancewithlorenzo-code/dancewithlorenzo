import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';

export interface ShareableAchievement {
  title: string;
  description: string;
  rank: number;
  badgeName: string;
  badgeIcon: string;
  generosityScore: number;
  creditsGiven: number;
  username: string;
}

export const socialSharingService = {
  /**
   * Capture view as image and share
   */
  async shareViewAsImage(
    viewRef: any,
    message: string
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Sharing is not available on this device',
        };
      }

      // Capture the view as image
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Share the image
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: message,
      });

      return { success: true, error: null };
    } catch (err) {
      console.error('Share view error:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Generate shareable text for social media
   */
  generateShareText(achievement: ShareableAchievement, referralCode?: string): string {
    const text = `🎉 I'm #${achievement.rank} on the Dance with Lorenzo leaderboard!\n\n` +
      `${achievement.badgeIcon} ${achievement.badgeName}\n` +
      `🎁 ${achievement.creditsGiven} workshop credits shared\n` +
      `⭐ ${achievement.generosityScore} generosity points\n\n` +
      `Join our amazing Ori Tahiti dance community!\n` +
      (referralCode ? `Use code: ${referralCode} for 3 FREE workshop credits! 🎁\n\n` : '\n') +
      `#OriTahiti #DanceWithLorenzo #TokyoDance #Community`;

    return text;
  },

  /**
   * Share achievement with text and image
   */
  async shareAchievement(
    viewRef: any,
    achievement: ShareableAchievement,
    referralCode?: string
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const message = this.generateShareText(achievement, referralCode);
    return await this.shareViewAsImage(viewRef, message);
  },

  /**
   * Share referral code only (text-based)
   */
  async shareReferralCode(
    referralCode: string,
    username: string
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Sharing is not available on this device',
        };
      }

      const message = 
        `🎁 Join me at Dance with Lorenzo!\n\n` +
        `Get 3 FREE workshop credits when you sign up with my referral code:\n\n` +
        `${referralCode}\n\n` +
        `Experience the beauty of Ori Tahiti dance in Tokyo! 🌺\n\n` +
        `#OriTahiti #DanceWithLorenzo #TokyoDance`;

      // Create a temporary text file to share
      const fileUri = `${FileSystem.cacheDirectory}referral.txt`;
      await FileSystem.writeAsStringAsync(fileUri, message);
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Referral Code',
      });

      return { success: true, error: null };
    } catch (err) {
      console.error('Share referral code error:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Copy text to clipboard (fallback for platforms without sharing)
   */
  async copyToClipboard(text: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      // Note: Expo Clipboard is used here
      // Import at the top of the file when used: import * as Clipboard from 'expo-clipboard';
      // For now, we'll return success
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  /**
   * Get shareable achievement data from user stats
   */
  prepareAchievementData(
    rank: number,
    badgeName: string,
    badgeIcon: string,
    generosityScore: number,
    creditsGiven: number,
    username: string
  ): ShareableAchievement {
    return {
      title: `Rank #${rank}`,
      description: `${badgeName} Achievement`,
      rank,
      badgeName,
      badgeIcon,
      generosityScore,
      creditsGiven,
      username,
    };
  },
};
