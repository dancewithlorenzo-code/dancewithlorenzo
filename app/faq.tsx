import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';

interface FAQItem {
  question: string;
  answer: string;
  icon: any;
}

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useLanguage();
  
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const faqData: FAQItem[] = language === 'ja' ? [
    // INTERNATIONAL BOOKINGS
    {
      question: '海外から予約できますか？',
      answer: 'はい！Dance with Lorenzoは世界中のダンサーを歓迎します。オンライングローバルクラスはどこからでも参加可能です。対面クラスは日本と国際イベント開催地で開催されます。アプリで利用可能なクラスを閲覧し、あなたの場所に合ったものを選択してください。',
      icon: 'public',
    },
    {
      question: '時差はどう対応していますか？',
      answer: 'すべてのクラス時間は日本標準時（JST/UTC+9）で表示されます。予約前にお住まいの地域の時間に変換してください。オンラインクラスは、世界中の参加者に対応するため、様々な時間帯で提供されています。クラス予約時に時差を再確認することをお勧めします。',
      icon: 'schedule',
    },
    {
      question: 'オンラインクラスに必要なものは？',
      answer: 'オンライングローバルクラスの要件：安定したインターネット接続（推奨10Mbps以上）、Zoom対応デバイス（PC、タブレット、スマートフォン）、動けるスペース（最低2m × 2m）、快適なダンスウェア、飲料水。Zoomリンクとクラス詳細は、予約確定後24時間前にメールで送信されます。',
      icon: 'computer',
    },
    {
      question: '国際イベントはどこで開催されますか？',
      answer: '私たちは定期的に日本国外でワークショップやイベントを開催しています。国際イベントの予定場所には、タヒチ、ハワイ、ニュージーランド、オーストラリア、ヨーロッパ都市などがあります。イベントページで今後の国際ワークショップを確認し、お住まいの地域での特別開催について通知を受け取るためにプッシュ通知を有効にしてください。',
      icon: 'flight-takeoff',
    },

    // PAYMENT METHODS
    {
      question: 'どのような支払い方法が利用できますか？',
      answer: '以下の支払い方法を受け付けています：クレジットカード/デビットカード（Visa、Mastercard、American Express）、Apple Pay（iOSデバイス）、Google Pay（Androidデバイス）、銀行振込（日本国内）。すべての支払いはStripeで安全に処理されます。',
      icon: 'payment',
    },
    {
      question: '海外のクレジットカードは使えますか？',
      answer: 'はい！世界中のクレジットカード/デビットカードを受け付けています。お使いのカードが国際取引に対応していることをご確認ください。銀行が海外取引手数料を請求する場合がありますので、カード発行会社にご確認ください。価格は日本円（JPY）で表示され、お使いのカードの通貨に自動的に換算されます。',
      icon: 'credit-card',
    },
    {
      question: '領収書はもらえますか？',
      answer: 'はい！すべての購入に対してメール領収書が自動的に送信されます。領収書には、取引詳細、ユニーク領収書番号、購入日、支払い方法、金額の内訳が含まれます。プロフィール→通知履歴で過去の領収書にアクセスできます。追加の領収書コピーが必要な場合は、contact@onspace.aiまでお問い合わせください。',
      icon: 'receipt',
    },
    {
      question: 'トークンとワークショップの違いは何ですか？',
      answer: '【トークン】12ヶ月有効、1トークン＝1BMDクラス、事前購入で割引（4トークン¥33,000）、最も柔軟なオプション。【ワークショップ】単発払い、クラス毎に支払い、5名以上¥12,000/人、5名未満¥15,000/人、トークンまたは直接支払い可能。定期的に参加する方にはトークンパッケージがおすすめです。',
      icon: 'toll',
    },

    // TIME ZONES & SCHEDULING
    {
      question: '自分の時間帯でクラス時間を見るには？',
      answer: 'アプリのすべてのクラス時間は日本標準時（JST）で表示されます。お住まいの地域の時間帯に変換するには：JSTはUTC+9、タイムゾーンコンバーター（timeanddate.com）を使用、またはGoogleで「JST to [あなたのタイムゾーン]」を検索してください。例：JST 18:00 ＝ EST 04:00、PST 01:00、CET 10:00。',
      icon: 'access-time',
    },
    {
      question: 'クラスの予約・キャンセル期限は？',
      answer: '【予約期限】クラス開始48時間前まで予約可能（空席がある場合）。【キャンセル期限】トークン全額返金：開始24時間前まで、現金払い全額返金：開始48時間前まで。24時間以内のキャンセルは返金なし、トークンは没収されます。緊急時はcontact@onspace.aiまでご連絡ください。',
      icon: 'event-busy',
    },
    {
      question: 'クラスの再スケジュールはできますか？',
      answer: 'はい！トークン予約は、開始24時間前までであれば無料で再スケジュール可能です。方法：ダッシュボード→マイクラス→予約を選択→「再スケジュール」をタップ→新しい日程を選択。現金払い予約の再スケジュールは、開始48時間前までに管理者承認が必要です。24時間以内の再スケジュールは新規予約として扱われます。',
      icon: 'update',
    },
    {
      question: 'クラスリマインダーは届きますか？',
      answer: 'はい！自動リマインダー：クラス24時間前にプッシュ通知とメール、Zoomリンク（オンラインクラスの場合）、場所確認（対面クラスの場合）、QRチェックインの準備（対面）。確実に受信するため、プロフィール設定でプッシュ通知を有効にし、メールアドレスが正しいことを確認してください。',
      icon: 'notifications-active',
    },

    // ONLINE CLASS REQUIREMENTS
    {
      question: 'Zoomのインストールが必要ですか？',
      answer: 'はい、オンライングローバルクラスにはZoomが必要です。セットアップ：zoom.usから無料のZoomアプリをダウンロード（PC、スマートフォン、タブレット対応）、無料アカウントを作成（有料版不要）、予約確定後に送信されるZoomリンクをテスト。クラス開始10分前にZoomリンクをクリックして参加してください。',
      icon: 'videocam',
    },
    {
      question: 'ダンスに必要なスペースは？',
      answer: '推奨スペース：最低2m × 2m（6.5フィート × 6.5フィート）、理想は3m × 3m、障害物なし（家具を移動）、滑りにくい床面（カーペットまたはヨガマット可）、カメラから全身が映る高さ。スペースが狭い場合は事前にお知らせください。動きを調整できる場合があります。',
      icon: 'aspect-ratio',
    },
    {
      question: 'ビデオをオンにする必要がありますか？',
      answer: '最良の学習体験のため、ビデオをオンにすることを強くお勧めします。インストラクターが姿勢をチェックし、リアルタイムで修正できます。ただし、必須ではありません。ビデオなしでも参加できますが、個別フィードバックは制限されます。プライバシーが心配な場合は、Zoomバーチャル背景を使用できます。',
      icon: 'videocam-off',
    },
    {
      question: '技術的な問題が発生したらどうすればいいですか？',
      answer: 'クラス前に：Zoom接続をテスト、インターネット速度をチェック（speedtest.net）、デバイスを再起動、他のアプリを閉じる。クラス中に問題が発生したら：Wi-Fiをオフ/オンにする、ビデオをオフにして帯域幅を節約、Zoomを再起動。引き続き問題がある場合は、クラス後にcontact@onspace.aiにご連絡いただければ、クレジットまたは返金を手配します。',
      icon: 'build',
    },

    // REFUND POLICIES
    {
      question: '返金ポリシーは何ですか？',
      answer: '【トークン】開始24時間前までのキャンセルで全額返金、12ヶ月の有効期限、未使用トークンの返金不可、特別な状況は個別対応。【ワークショップクラス】開始48時間前までのキャンセルで全額返金、24-48時間前のキャンセルは50%返金、24時間以内のキャンセルは返金なし。【プライベートレッスン】開始72時間前までのキャンセルで全額返金、それ以降は返金なし。',
      icon: 'attach-money',
    },
    {
      question: '返金処理にどのくらいかかりますか？',
      answer: '返金タイムライン：承認即時、Stripeへの返金処理：1-2営業日、カード/銀行口座への反映：5-10営業日（銀行により異なる）。10営業日以内に返金が確認できない場合は、銀行/カード会社にお問い合わせいただくか、contact@onspace.aiまでご連絡ください。トランザクションIDとタイムラインをご提供します。',
      icon: 'schedule',
    },
    {
      question: 'トークンは返金できますか？',
      answer: 'トークン返金ポリシー：未使用トークンは購入後30日以内であれば全額返金可能、30日経過後は返金不可（ただし譲渡可能）、使用済みトークンは返金不可、特別な状況（医療上の緊急事態、転居）は個別対応。返金リクエストは、プロフィール→サポートまたはcontact@onspace.aiまでお問い合わせください。',
      icon: 'toll',
    },
    {
      question: 'クラスがキャンセルされたらどうなりますか？',
      answer: 'インストラクター側でクラスがキャンセルされた場合：即座にメール/プッシュ通知、自動全額返金（トークンまたは現金）、同等の代替クラスオプション、優先予約（次回利用時）。返金は5-7営業日以内に処理されます。キャンセルは稀ですが、緊急時や不可抗力の場合に発生することがあります。',
      icon: 'cancel',
    },

    // GIFT CARDS & TRANSFERS
    {
      question: 'ギフトカードの仕組みは？',
      answer: 'Dance with Lorenzoギフトカードを送りましょう！受取人のメールとメッセージを入力、トークンパッケージを選択（4トークン、8トークン、12トークン）、購入を完了、受取人にユニークなコードが送信されます。ギフトカードは12ヶ月有効、譲渡可能、どのBMDクラスでも使用可能です。',
      icon: 'card-giftcard',
    },
    {
      question: '友達にトークンを譲渡できますか？',
      answer: 'はい！トークン譲渡機能：プロフィール→トークン譲渡へ、受取人のメール入力、譲渡するトークン数を選択、オプションでメッセージを追加、確認して送信。譲渡は即座に反映され、受取人に通知されます。譲渡後の取り消しは不可能ですので、メールアドレスを再確認してください。',
      icon: 'send',
    },

    // GENERAL
    {
      question: 'テクニカルサポートに連絡するには？',
      answer: 'サポートチャンネル：メール：contact@onspace.ai（24時間以内に返信）、アプリ内：プロフィール→ヘルプ＆サポート、緊急時：クラス開始2時間前の技術的問題は優先対応。お問い合わせの際は、ユーザーID、問題の説明、スクリーンショット（可能であれば）、デバイス/OS情報をお知らせください。',
      icon: 'support-agent',
    },
    {
      question: 'アカウントを削除できますか？',
      answer: 'はい、アカウント削除をリクエストできます。注意事項：すべての予約履歴が削除されます、未使用トークンは没収されます（譲渡を先に検討してください）、データは30日後に完全削除されます、削除は取り消せません。削除するには、プロフィール→設定→アカウント削除、またはcontact@onspace.aiまでリクエストしてください。',
      icon: 'delete-forever',
    },
    {
      question: 'プライバシーポリシーはどこで確認できますか？',
      answer: 'プライバシーポリシーと利用規約：Webサイト：dancewithlorenzotokyojapan.info/privacy-policy-jp.html、アプリ：プロフィール→法的情報。私たちはあなたのデータを深刻に受け止めています。GDPR準拠、暗号化された安全な保存、マーケティング目的で第三者と共有しません、いつでもデータエクスポートをリクエスト可能です。',
      icon: 'privacy-tip',
    },
  ] : [
    // INTERNATIONAL BOOKINGS
    {
      question: 'Can I book classes from outside Japan?',
      answer: 'Yes! Dance with Lorenzo welcomes dancers worldwide. Online Global classes are accessible from anywhere. In-person classes are held in Japan and at international event locations. Browse available classes in the app and select the ones that fit your location.',
      icon: 'public',
    },
    {
      question: 'How do you handle time zones?',
      answer: 'All class times are displayed in Japan Standard Time (JST/UTC+9). Before booking, convert to your local time zone. Online classes are scheduled across various time slots to accommodate global participants. We recommend double-checking the time zone conversion when booking your class.',
      icon: 'schedule',
    },
    {
      question: 'What do I need for online classes?',
      answer: 'Online Global class requirements: Stable internet connection (10Mbps+ recommended), Zoom-compatible device (computer, tablet, smartphone), Space to move (minimum 2m × 2m), Comfortable dance wear, Water bottle. Zoom links and class details are sent via email 24 hours before class after booking confirmation.',
      icon: 'computer',
    },
    {
      question: 'Where are international events held?',
      answer: 'We regularly host workshops and events outside Japan. Upcoming international event locations include: Tahiti, Hawaii, New Zealand, Australia, European cities. Check the Events page for upcoming international workshops and enable push notifications to be notified about special events in your region.',
      icon: 'flight-takeoff',
    },

    // PAYMENT METHODS
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept the following payment methods: Credit/Debit Cards (Visa, Mastercard, American Express), Apple Pay (iOS devices), Google Pay (Android devices), Bank Transfer (Japan domestic). All payments are securely processed via Stripe.',
      icon: 'payment',
    },
    {
      question: 'Can I use international credit cards?',
      answer: 'Yes! We accept credit/debit cards from around the world. Please ensure your card is enabled for international transactions. Your bank may charge foreign transaction fees—check with your card issuer. Prices are shown in Japanese Yen (JPY) and automatically converted to your card currency.',
      icon: 'credit-card',
    },
    {
      question: 'Will I receive a receipt?',
      answer: 'Yes! Email receipts are automatically sent for all purchases. Receipts include: Transaction details, Unique receipt number, Purchase date, Payment method, Itemized breakdown. Access past receipts in Profile → Notification History. If you need additional receipt copies, contact contact@onspace.ai.',
      icon: 'receipt',
    },
    {
      question: 'What is the difference between tokens and workshops?',
      answer: '[TOKENS] Valid for 12 months, 1 token = 1 BMD class, Pre-purchase discount (4 tokens ¥33,000), Most flexible option. [WORKSHOPS] Pay-per-class, Pay as you attend, 5+ people: ¥12,000/person, <5 people: ¥15,000/person, Use tokens or pay directly. Token packages are recommended for regular attendees.',
      icon: 'toll',
    },

    // TIME ZONES & SCHEDULING
    {
      question: 'How can I see class times in my timezone?',
      answer: 'All class times in the app are shown in Japan Standard Time (JST). To convert to your local timezone: JST is UTC+9, Use a timezone converter (timeanddate.com), Or search Google for "JST to [your timezone]". Example: JST 18:00 = EST 04:00, PST 01:00, CET 10:00.',
      icon: 'access-time',
    },
    {
      question: 'What are the booking and cancellation deadlines?',
      answer: '[BOOKING DEADLINE] Book up to 48 hours before class start (if spots available). [CANCELLATION DEADLINE] Token full refund: 24 hours before start, Cash payment full refund: 48 hours before start. Cancellations within 24 hours: No refund, token forfeited. Emergency situations: Contact contact@onspace.ai.',
      icon: 'event-busy',
    },
    {
      question: 'Can I reschedule my class?',
      answer: 'Yes! Token bookings can be rescheduled for free up to 24 hours before class start. How: Dashboard → My Classes → Select booking → Tap "Reschedule" → Choose new date. Cash payment bookings require admin approval for rescheduling (request 48+ hours before). Rescheduling within 24 hours counts as new booking.',
      icon: 'update',
    },
    {
      question: 'Will I receive class reminders?',
      answer: 'Yes! Automatic reminders sent: 24 hours before class via push notification and email, Zoom link included (for online classes), Location confirmation (for in-person classes), QR check-in ready (in-person). To ensure you receive reminders, enable push notifications in Profile settings and verify your email address is correct.',
      icon: 'notifications-active',
    },

    // ONLINE CLASS REQUIREMENTS
    {
      question: 'Do I need to install Zoom?',
      answer: 'Yes, Zoom is required for Online Global classes. Setup: Download free Zoom app from zoom.us (works on computer, phone, tablet), Create free account (no paid version needed), Test your Zoom link sent after booking confirmation. Join by clicking the Zoom link 10 minutes before class start.',
      icon: 'videocam',
    },
    {
      question: 'How much space do I need for dancing?',
      answer: 'Recommended space: Minimum 2m × 2m (6.5ft × 6.5ft), Ideal 3m × 3m, Clear of obstacles (move furniture), Non-slip flooring (carpet or yoga mat acceptable), Height to see full body in camera. If you have limited space, let us know in advance—we can modify movements when possible.',
      icon: 'aspect-ratio',
    },
    {
      question: 'Do I need to have my video on?',
      answer: 'We strongly encourage video ON for best learning experience—instructor can check your posture and provide real-time corrections. However, it is NOT mandatory. You can participate with video off, but individual feedback will be limited. If privacy is a concern, you can use Zoom virtual backgrounds.',
      icon: 'videocam-off',
    },
    {
      question: 'What if I have technical issues?',
      answer: 'Before class: Test your Zoom connection, Check internet speed (speedtest.net), Restart your device, Close other apps. During class issues: Turn Wi-Fi off/on, Turn video off to save bandwidth, Restart Zoom. If issues persist, contact us after class at contact@onspace.ai—we will arrange a credit or refund.',
      icon: 'build',
    },

    // REFUND POLICIES
    {
      question: 'What is your refund policy?',
      answer: '[TOKENS] Full refund if cancelled 24+ hours before class, 12-month validity period, No refund for unused expired tokens, Special circumstances reviewed case-by-case. [WORKSHOP CLASSES] Full refund if cancelled 48+ hours before, 50% refund if cancelled 24-48 hours before, No refund within 24 hours. [PRIVATE LESSONS] Full refund if cancelled 72+ hours before, No refund after that.',
      icon: 'attach-money',
    },
    {
      question: 'How long do refunds take to process?',
      answer: 'Refund timeline: Approval immediate, Refund to Stripe: 1-2 business days, Reflection in card/bank account: 5-10 business days (varies by bank). If you do not see your refund within 10 business days, contact your bank/card company or reach out to contact@onspace.ai—we will provide transaction ID and timeline.',
      icon: 'schedule',
    },
    {
      question: 'Can I get a refund on tokens?',
      answer: 'Token refund policy: Unused tokens can be fully refunded within 30 days of purchase, After 30 days: no refund (but transferable to friends), Used tokens: no refund, Special circumstances (medical emergency, relocation): reviewed individually. To request refund, go to Profile → Support or email contact@onspace.ai.',
      icon: 'toll',
    },
    {
      question: 'What happens if a class is cancelled?',
      answer: 'If a class is cancelled by the instructor: Immediate email/push notification, Automatic full refund (token or cash), Alternative class options provided, Priority booking for next sessions. Refunds processed within 5-7 business days. Cancellations are rare and only occur due to emergencies or force majeure.',
      icon: 'cancel',
    },

    // GIFT CARDS & TRANSFERS
    {
      question: 'How do gift cards work?',
      answer: 'Send a Dance with Lorenzo gift card! Enter recipient email and message, Choose token package (4 tokens, 8 tokens, 12 tokens), Complete purchase, Unique code sent to recipient. Gift cards are valid for 12 months, transferable, and usable for any BMD class.',
      icon: 'card-giftcard',
    },
    {
      question: 'Can I transfer tokens to a friend?',
      answer: 'Yes! Token transfer feature: Go to Profile → Transfer Tokens, Enter recipient email, Choose number of tokens to transfer, Add optional message, Confirm and send. Transfer is instant and recipient gets notified. Transfers cannot be reversed, so double-check the email address.',
      icon: 'send',
    },

    // GENERAL
    {
      question: 'How do I contact technical support?',
      answer: 'Support channels: Email: contact@onspace.ai (response within 24 hours), In-app: Profile → Help & Support, Urgent: Technical issues within 2 hours of class start get priority. When contacting us, include: User ID, Description of issue, Screenshots (if possible), Device/OS information.',
      icon: 'support-agent',
    },
    {
      question: 'Can I delete my account?',
      answer: 'Yes, you can request account deletion. Please note: All booking history will be removed, Unused tokens will be forfeited (consider transferring first), Data permanently deleted after 30 days, Deletion cannot be undone. To delete, go to Profile → Settings → Delete Account or email contact@onspace.ai with your request.',
      icon: 'delete-forever',
    },
    {
      question: 'Where can I find your privacy policy?',
      answer: 'Privacy Policy and Terms of Service: Website: dancewithlorenzotokyojapan.info/privacy-policy.html, App: Profile → Legal Information. We take your data seriously: GDPR compliant, Encrypted secure storage, Never shared with third parties for marketing, Data export available on request.',
      icon: 'privacy-tip',
    },
  ];

  const categories = language === 'ja' ? [
    { title: '国際予約', icon: 'public', start: 0, count: 4 },
    { title: '支払い方法', icon: 'payment', start: 4, count: 4 },
    { title: 'タイムゾーン＆スケジュール', icon: 'schedule', start: 8, count: 4 },
    { title: 'オンラインクラス要件', icon: 'computer', start: 12, count: 4 },
    { title: '返金ポリシー', icon: 'attach-money', start: 16, count: 4 },
    { title: 'ギフトカード＆譲渡', icon: 'card-giftcard', start: 20, count: 2 },
    { title: '一般', icon: 'help-outline', start: 22, count: 3 },
  ] : [
    { title: 'International Bookings', icon: 'public', start: 0, count: 4 },
    { title: 'Payment Methods', icon: 'payment', start: 4, count: 4 },
    { title: 'Time Zones & Scheduling', icon: 'schedule', start: 8, count: 4 },
    { title: 'Online Class Requirements', icon: 'computer', start: 12, count: 4 },
    { title: 'Refund Policies', icon: 'attach-money', start: 16, count: 4 },
    { title: 'Gift Cards & Transfers', icon: 'card-giftcard', start: 20, count: 2 },
    { title: 'General', icon: 'help-outline', start: 22, count: 3 },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{language === 'ja' ? 'よくある質問' : 'FAQ'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="help-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>
            {language === 'ja' ? 'よくある質問' : 'Frequently Asked Questions'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {language === 'ja' 
              ? 'Dance with Lorenzoについての一般的な質問への回答を見つけましょう'
              : 'Find answers to common questions about Dance with Lorenzo'}
          </Text>
        </View>

        {/* FAQ Categories */}
        {categories.map((category, categoryIndex) => (
          <View key={categoryIndex} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <MaterialIcons name={category.icon} size={24} color={colors.primary} />
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </View>

            {faqData.slice(category.start, category.start + category.count).map((item, itemIndex) => {
              const globalIndex = category.start + itemIndex;
              const isExpanded = expandedIndex === globalIndex;

              return (
                <Pressable
                  key={globalIndex}
                  style={({ pressed }) => [
                    styles.faqItem,
                    isExpanded && styles.faqItemExpanded,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => toggleQuestion(globalIndex)}
                >
                  <View style={styles.questionRow}>
                    <MaterialIcons 
                      name={item.icon} 
                      size={20} 
                      color={isExpanded ? colors.primary : colors.textLight} 
                      style={styles.questionIcon}
                    />
                    <Text style={[styles.questionText, isExpanded && styles.questionTextExpanded]}>
                      {item.question}
                    </Text>
                    <MaterialIcons
                      name={isExpanded ? 'expand-less' : 'expand-more'}
                      size={24}
                      color={isExpanded ? colors.primary : colors.textLight}
                    />
                  </View>

                  {isExpanded && (
                    <View style={styles.answerContainer}>
                      <View style={styles.answerDivider} />
                      <Text style={styles.answerText}>{item.answer}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* Contact Support Section */}
        <View style={styles.supportSection}>
          <MaterialIcons name="support-agent" size={32} color={colors.accent} />
          <Text style={styles.supportTitle}>
            {language === 'ja' ? '質問が見つかりませんか？' : 'Still have questions?'}
          </Text>
          <Text style={styles.supportText}>
            {language === 'ja'
              ? 'サポートチームがお手伝いします'
              : 'Our support team is here to help'}
          </Text>
          <Pressable
            style={styles.contactButton}
            onPress={() => {
              // Open email client
              const email = 'contact@onspace.ai';
              const subject = language === 'ja' ? 'Dance with Lorenzo - サポート' : 'Dance with Lorenzo - Support';
              // In a real app, you would use Linking.openURL(`mailto:${email}?subject=${subject}`)
            }}
          >
            <MaterialIcons name="email" size={20} color={colors.surface} />
            <Text style={styles.contactButtonText}>contact@onspace.ai</Text>
          </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    maxWidth: 320,
  },
  categorySection: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  categoryTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
  },
  faqItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  faqItemExpanded: {
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  questionIcon: {
    marginRight: spacing.xs,
  },
  questionText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
  },
  questionTextExpanded: {
    color: colors.primary,
  },
  answerContainer: {
    marginTop: spacing.md,
  },
  answerDivider: {
    height: 1,
    backgroundColor: colors.primary + '20',
    marginBottom: spacing.md,
  },
  answerText: {
    ...typography.body,
    color: colors.textLight,
    lineHeight: 24,
  },
  supportSection: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  supportTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  supportText: {
    ...typography.body,
    color: colors.textLight,
    marginBottom: spacing.lg,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  contactButtonText: {
    ...typography.button,
    color: colors.surface,
  },
});
