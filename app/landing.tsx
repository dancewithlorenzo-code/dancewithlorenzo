import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/template';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import {
  fetchActivePromotions,
  FlashPromotion,
  getTimeRemaining,
} from '@/services/flashPromotionService';

// ─── Constants ────────────────────────────────────────────────────────────────
const OFFER_EXPIRY = new Date('2026-03-15T23:59:59');

// Fixed safe values — avoids stale Dimensions on device
const WIN = Dimensions.get('window');
const BASE_WIDTH = WIN.width > 100 ? WIN.width : 390;

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [screenWidth, setScreenWidth] = useState(BASE_WIDTH);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      if (window.width > 100) setScreenWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  // Card width: 2 columns with 16px side padding each + 12px gap between
  const CARD_W = Math.floor((screenWidth - 32 - 12) / 2);

  // ── Auth redirect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && user) router.replace('/(tabs)/dashboard');
  }, [user, loading]);

  // ── Flash promotions ───────────────────────────────────────────────────────
  const [flashPromos, setFlashPromos] = useState<FlashPromotion[]>([]);
  const [promoTimers, setPromoTimers] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchActivePromotions().then(({ data }) => { if (data) setFlashPromos(data); });
  }, []);

  useEffect(() => {
    if (!flashPromos.length) return;
    const tick = () => {
      const t: Record<string, any> = {};
      flashPromos.forEach(p => { t[p.id] = getTimeRemaining(p.end_date); });
      setPromoTimers(t);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [flashPromos]);

  // ── Launch countdown ───────────────────────────────────────────────────────
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = OFFER_EXPIRY.getTime() - Date.now();
      if (diff <= 0) { setCountdown({ days: 0, hours: 0, minutes: 0 }); return; }
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  const goAuth = () => router.push('/auth');
  const toggleLang = () => setLanguage(language === 'ja' ? 'en' : 'ja');

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient colors={['#FF1493', '#9C27B0']} style={styles.loadWrap}>
        <MaterialIcons name="auto-awesome" size={40} color="#fff" />
        <Text style={styles.loadText}>Loading…</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        bounces
      >

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#D81B60', '#9C27B0', '#3949AB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
        >
          {/* Language pill */}
          <Pressable style={styles.langBtn} onPress={toggleLang} hitSlop={12}>
            <MaterialIcons name="language" size={16} color="#fff" />
            <Text style={styles.langText}>{language === 'ja' ? 'EN' : 'JA'}</Text>
          </Pressable>

          {/* Logo + title row */}
          <View style={styles.heroTop}>
            <Image
              source={require('@/assets/images/logo.jpeg')}
              style={styles.logo}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.heroTitles}>
              <Text style={styles.titleSm}>Dance with</Text>
              <Text style={styles.titleLg}>Lorenzo</Text>
            </View>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline} numberOfLines={2}>{t('landing_tagline')}</Text>

          {/* Primary CTA — always visible in hero */}
          <Pressable
            style={({ pressed }) => [styles.heroCta, pressed && { opacity: 0.85 }]}
            onPress={goAuth}
          >
            <LinearGradient
              colors={['#FF1493', '#FF6347']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroCtaGrad}
            >
              <MaterialIcons name="auto-awesome" size={20} color="#fff" />
              <Text style={styles.heroCtaText}>{t('get_started')}</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>

          {/* Secondary login link */}
          <Pressable style={styles.loginLink} onPress={goAuth} hitSlop={8}>
            <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkBold}>Log In</Text></Text>
          </Pressable>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { icon: 'location-on', num: '全国', label: 'All Japan' },
              { icon: 'event',       num: '100+', label: 'Classes'  },
              { icon: 'people',      num: '500+', label: 'Dancers'  },
            ].map(s => (
              <View key={s.label} style={styles.statPill}>
                <MaterialIcons name={s.icon as any} size={16} color="#FFD700" />
                <Text style={styles.statNum}>{s.num}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── PROMO BANNER ──────────────────────────────────────────────────── */}
        {flashPromos.length > 0
          ? flashPromos.map(promo => {
              const timer = promoTimers[promo.id];
              if (timer?.expired) return null;
              const dst = promo.promotion_type === 'class'   ? '/(tabs)/classes'
                        : promo.promotion_type === 'product' ? '/boutique'
                        : promo.promotion_type === 'bundle'  ? '/(tabs)/tokens'
                        : '/auth';
              return (
                <Pressable
                  key={promo.id}
                  style={({ pressed }) => [styles.promoBanner, pressed && { opacity: 0.9 }]}
                  onPress={() => router.push(promo.action_url?.startsWith('/') ? (promo.action_url as any) : dst)}
                >
                  <LinearGradient
                    colors={[promo.style_color, promo.style_color + 'cc']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.promoBannerInner}
                  >
                    <MaterialIcons name={promo.icon_name as any} size={22} color="#fff" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.promoTitle} numberOfLines={1}>{promo.title}</Text>
                      <Text style={styles.promoSub} numberOfLines={1}>{promo.message}</Text>
                    </View>
                    {timer && !timer.expired && (
                      <Text style={styles.promoTimer}>{timer.days}d {timer.hours}h</Text>
                    )}
                    <MaterialIcons name="chevron-right" size={20} color="#fff" />
                  </LinearGradient>
                </Pressable>
              );
            })
          : (
            <Pressable
              style={({ pressed }) => [styles.promoBanner, pressed && { opacity: 0.9 }]}
              onPress={() => router.push('/(tabs)/tokens')}
            >
              <LinearGradient
                colors={['#FF8C00', '#FF4500']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.promoBannerInner}
              >
                <MaterialIcons name="local-fire-department" size={22} color="#fff" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.promoTitle}>LAUNCH OFFER — ¥33,000 / 4 Tokens</Text>
                  <Text style={styles.promoSub}>Expires in {countdown.days}d {countdown.hours}h {countdown.minutes}m</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#fff" />
              </LinearGradient>
            </Pressable>
          )
        }

        {/* ── FEATURE GRID ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Why Choose Us ✨</Text>
          <View style={styles.grid}>
            {[
              { icon: 'stars',          title: 'Premium Classes',  desc: 'World-class Ori Tahiti',     grad: ['#E91E8C','#F06292'] as [string,string], dst: '/auth' },
              { icon: 'toll',           title: 'Token System',     desc: 'Valid 12 months',            grad: ['#7B1FA2','#BA68C8'] as [string,string], dst: '/auth' },
              { icon: 'music-note',     title: "Music Store",      desc: 'Authentic Tahitian tracks',  grad: ['#E53935','#FF6B35'] as [string,string], dst: '/auth' },
              { icon: 'person-pin',     title: 'Private Lessons',  desc: 'Personal 1-on-1 training',   grad: ['#E65100','#FF8C00'] as [string,string], dst: '/auth' },
              { icon: 'store',          title: 'Boutique',         desc: 'Costumes & accessories',     grad: ['#1B5E20','#43A047'] as [string,string], dst: '/boutique' },
              { icon: 'card-giftcard',  title: 'Gift Cards',       desc: 'Share the joy of dance',     grad: ['#006064','#00ACC1'] as [string,string], dst: '/auth' },
            ].map(item => (
              <Pressable
                key={item.title}
                style={({ pressed }) => [styles.card, { width: CARD_W }, pressed && { opacity: 0.85 }]}
                onPress={() => router.push(item.dst as any)}
              >
                <LinearGradient
                  colors={item.grad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.cardGrad}
                >
                  <View style={styles.cardIcon}>
                    <MaterialIcons name={item.icon as any} size={24} color="#fff" />
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc}>{item.desc}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── PRICING ───────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💎 Pricing</Text>

          <LinearGradient
            colors={['#6A1B9A', '#4A148C']}
            style={styles.priceCard}
          >
            <Text style={styles.priceCardBadge}>⭐ MOST POPULAR</Text>
            <Text style={styles.priceCardName}>BMD Token Package</Text>
            <Text style={styles.priceCardAmt}>¥33,000</Text>
            <Text style={styles.priceCardSub}>4 Tokens · Valid 12 months</Text>
            {['Flexible scheduling', 'Any BMD class', 'Priority booking'].map(b => (
              <View key={b} style={styles.benefitRow}>
                <MaterialIcons name="check-circle" size={15} color="#69F0AE" />
                <Text style={styles.benefitTxt}>{b}</Text>
              </View>
            ))}
          </LinearGradient>

          <View style={styles.pricePairRow}>
            <LinearGradient colors={['#1565C0','#0D47A1']} style={styles.pricePairCard}>
              <MaterialIcons name="groups" size={24} color="#FFD700" />
              <Text style={styles.pairTitle}>Workshop</Text>
              <Text style={styles.pairAmt}>¥12,000+</Text>
              <Text style={styles.pairSub}>Per person</Text>
            </LinearGradient>
            <LinearGradient colors={['#AD1457','#880E4F']} style={styles.pricePairCard}>
              <MaterialIcons name="star" size={24} color="#FFD700" />
              <Text style={styles.pairTitle}>Private</Text>
              <Text style={styles.pairAmt}>¥40,000</Text>
              <Text style={styles.pairSub}>Per session</Text>
            </LinearGradient>
          </View>
        </View>

        {/* ── BOTTOM CTA ────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.bottomCta, pressed && { opacity: 0.9 }]}
            onPress={goAuth}
          >
            <LinearGradient
              colors={['#D81B60', '#FF6347']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.bottomCtaGrad}
            >
              <MaterialIcons name="auto-awesome" size={22} color="#fff" />
              <Text style={styles.bottomCtaTxt}>{t('get_started')}</Text>
              <MaterialIcons name="arrow-forward" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
          <Text style={styles.ctaSub}>No credit card required · Browse free</Text>

          <Pressable
            style={styles.faqLink}
            onPress={() => router.push('/faq')}
            hitSlop={8}
          >
            <MaterialIcons name="help-outline" size={16} color={colors.primary} />
            <Text style={styles.faqTxt}>{language === 'ja' ? 'よくある質問' : 'FAQ'}</Text>
          </Pressable>

          <Text style={styles.copyright}>© 2026 Dance with Lorenzo · All rights reserved</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flexGrow: 1 },

  // Loading
  loadWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadText:  { color: '#fff', fontSize: 16, fontWeight: '600' },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  langBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    minHeight: 36,
  },
  langText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroTitles: { flex: 1 },
  titleSm: {
    fontSize: 18,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 1,
    lineHeight: 22,
  },
  titleLg: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    lineHeight: 38,
  },

  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
  },

  // Hero CTA button
  heroCta: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    ...shadows.lg,
  },
  heroCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 10,
  },
  heroCtaText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },

  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 14,
  },
  loginLinkText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  loginLinkBold: { fontWeight: '700', color: '#fff' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  statNum: { fontSize: 14, fontWeight: '900', color: '#fff' },
  statLbl: { fontSize: 9,  color: 'rgba(255,255,255,0.85)' },

  // ── Promo banner ───────────────────────────────────────────────────────────
  promoBanner: { marginHorizontal: 16, marginTop: 12 },
  promoBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    ...shadows.md,
  },
  promoTitle: { fontSize: 13, fontWeight: '800', color: '#fff' },
  promoSub:   { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  promoTimer: { fontSize: 11, fontWeight: '700', color: '#fff', marginRight: 4 },

  // ── Section ────────────────────────────────────────────────────────────────
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 14,
  },

  // Feature grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardGrad: {
    padding: 14,
    minHeight: 120,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardDesc:  { fontSize: 11, color: 'rgba(255,255,255,0.88)', lineHeight: 15 },

  // Pricing
  priceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    ...shadows.md,
  },
  priceCardBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  priceCardName: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4 },
  priceCardAmt:  { fontSize: 38, fontWeight: '900', color: '#fff', lineHeight: 44 },
  priceCardSub:  { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  benefitRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  benefitTxt:    { fontSize: 13, color: '#fff', fontWeight: '500' },

  pricePairRow: { flexDirection: 'row', gap: 12 },
  pricePairCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    ...shadows.sm,
    gap: 4,
  },
  pairTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  pairAmt:   { fontSize: 22, fontWeight: '900', color: '#fff' },
  pairSub:   { fontSize: 11, color: 'rgba(255,255,255,0.8)' },

  // Bottom CTA
  bottomCta: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    ...shadows.lg,
  },
  bottomCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  bottomCtaTxt: { fontSize: 17, fontWeight: '800', color: '#fff' },
  ctaSub: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },

  faqLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    minHeight: 44,
  },
  faqTxt: { fontSize: 14, fontWeight: '600', color: colors.primary },

  copyright: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
});
