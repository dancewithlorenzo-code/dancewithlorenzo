import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useLanguage } from '@/hooks/useLanguage';
import { useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';

const DONATION_AMOUNTS = [
  { amount: 1000, label: '¥1,000' },
  { amount: 3000, label: '¥3,000' },
  { amount: 5000, label: '¥5,000' },
  { amount: 10000, label: '¥10,000' },
];

export default function DonateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { showAlert } = useAlert();
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(3000); // Pre-select ¥3,000
  const [customAmount, setCustomAmount] = useState('');

  const handleDonate = () => {
    const finalAmount = selectedAmount || parseInt(customAmount) || 0;
    
    if (finalAmount < 100) {
      showAlert(
        language === 'ja' ? 'エラー' : 'Error',
        language === 'ja' ? '最低寄付額は¥100です' : 'Minimum donation is ¥100'
      );
      return;
    }

    // Show manual payment instructions
    showAlert(
      language === 'ja' ? 'ありがとうございます！' : 'Thank You!',
      language === 'ja'
        ? `¥${finalAmount.toLocaleString()}の寄付に感謝します！\n\n支払い方法：\n💳 銀行振込\n💴 クラスで現金\n\nロレンゾに連絡して支払いを確認してください。`
        : `Thank you for donating ¥${finalAmount.toLocaleString()}!\n\nPayment methods:\n💳 Bank transfer\n💴 Cash at class\n\nContact Lorenzo to confirm your donation.`
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Compact Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <MaterialIcons name="close" size={28} color={colors.surface} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Compact Hero */}
          <View style={styles.heroContainer}>
            <Image
              source={require('@/assets/images/donation-hero.png')}
              style={styles.heroImage}
              contentFit="cover"
            />
            <View style={styles.heroOverlay}>
              <MaterialIcons name="favorite" size={48} color={colors.surface} />
              <Text style={styles.heroTitle}>
                {language === 'ja' 
                  ? 'あなたの愛が私たちのインスピレーションを流れる' 
                  : 'Your Love Flows Through Our Inspiration'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {language === 'ja'
                  ? '私たちの夢を増幅してくれてありがとう'
                  : 'Thank You for Amplifying Our Dream'}
              </Text>
            </View>
          </View>

          {/* Quick Donation Amounts */}
          <View style={styles.amountSection}>
            <View style={styles.amountGrid}>
              {DONATION_AMOUNTS.map((item) => (
                <Pressable
                  key={item.amount}
                  style={[
                    styles.amountButton,
                    selectedAmount === item.amount && styles.amountButtonActive
                  ]}
                  onPress={() => {
                    setSelectedAmount(item.amount);
                    setCustomAmount('');
                  }}
                >
                  <Text style={[
                    styles.amountText,
                    selectedAmount === item.amount && styles.amountTextActive
                  ]}>
                    {item.label}
                  </Text>
                  {selectedAmount === item.amount && (
                    <MaterialIcons name="check-circle" size={20} color={colors.surface} />
                  )}
                </Pressable>
              ))}
            </View>

            <View style={styles.customAmountInput}>
              <Text style={styles.currencySymbol}>¥</Text>
              <TextInput
                style={styles.input}
                placeholder={language === 'ja' ? 'カスタム金額' : 'Custom amount'}
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                value={customAmount}
                onChangeText={(text) => {
                  setCustomAmount(text);
                  setSelectedAmount(null);
                }}
              />
            </View>
          </View>

          {/* Compact Impact Icons */}
          <View style={styles.impactIcons}>
            <View style={styles.impactIconItem}>
              <MaterialIcons name="school" size={32} color={colors.primary} />
              <Text style={styles.impactIconLabel}>
                {language === 'ja' ? '文化教育' : 'Education'}
              </Text>
            </View>
            <View style={styles.impactIconItem}>
              <MaterialIcons name="people" size={32} color={colors.primary} />
              <Text style={styles.impactIconLabel}>
                {language === 'ja' ? 'コミュニティ' : 'Community'}
              </Text>
            </View>
            <View style={styles.impactIconItem}>
              <MaterialIcons name="location-on" size={32} color={colors.primary} />
              <Text style={styles.impactIconLabel}>
                {language === 'ja' ? 'スタジオ' : 'Studios'}
              </Text>
            </View>
            <View style={styles.impactIconItem}>
              <MaterialIcons name="celebration" size={32} color={colors.primary} />
              <Text style={styles.impactIconLabel}>
                {language === 'ja' ? 'イベント' : 'Events'}
              </Text>
            </View>
          </View>

          {/* Big Donate Button */}
          <Pressable
            style={[
              styles.donateButton,
              (!selectedAmount && !customAmount) && styles.donateButtonDisabled
            ]}
            onPress={handleDonate}
            disabled={!selectedAmount && !customAmount}
          >
            <MaterialIcons name="volunteer-activism" size={32} color={colors.surface} />
            <View>
              <Text style={styles.donateButtonText}>
                {language === 'ja' ? '今すぐ寄付' : 'Donate Now'}
              </Text>
              {selectedAmount && (
                <Text style={styles.donateButtonAmount}>¥{selectedAmount.toLocaleString()}</Text>
              )}
            </View>
          </Pressable>

          {/* Payment Methods Notice */}
          <View style={styles.securityNotice}>
            <MaterialIcons name="info-outline" size={16} color={colors.primary} />
            <Text style={styles.securityText}>
              {language === 'ja'
                ? '銀行振込または現金でのお支払い'
                : 'Pay via bank transfer or cash at class'}
            </Text>
          </View>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.text + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  heroContainer: {
    height: 350,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.text + 'DD',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  heroTitle: {
    ...typography.h1,
    fontSize: 24,
    color: colors.surface,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '700',
  },
  heroSubtitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  amountSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  amountButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary + '30',
    gap: spacing.xs,
    ...shadows.md,
  },
  amountButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  amountText: {
    ...typography.h2,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  amountTextActive: {
    color: colors.surface,
  },
  customAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 3,
    borderColor: colors.primary + '30',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    ...shadows.md,
  },
  currencySymbol: {
    ...typography.h2,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.h2,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.lg,
  },
  impactIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  impactIconItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  impactIconLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textLight,
    textAlign: 'center',
    fontWeight: '600',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.xl,
    gap: spacing.md,
    ...shadows.xl,
  },
  donateButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.5,
  },
  donateButtonText: {
    ...typography.h2,
    fontSize: 22,
    fontWeight: '700',
    color: colors.surface,
  },
  donateButtonAmount: {
    ...typography.caption,
    fontSize: 14,
    color: colors.surface + 'DD',
    marginTop: spacing.xs,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  securityText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
