const translationData = {
  // Common
  loading: { en: 'Loading...', ja: '読み込み中...' },
  error: { en: 'Error', ja: 'エラー' },
  success: { en: 'Success', ja: '成功' },
  confirm: { en: 'Confirm', ja: '確認' },
  cancel: { en: 'Cancel', ja: 'キャンセル' },
  save: { en: 'Save', ja: '保存' },
  delete: { en: 'Delete', ja: '削除' },
  edit: { en: 'Edit', ja: '編集' },
  close: { en: 'Close', ja: '閉じる' },
  back: { en: 'Back', ja: '戻る' },
  next: { en: 'Next', ja: '次へ' },
  submit: { en: 'Submit', ja: '送信' },
  search: { en: 'Search', ja: '検索' },

  // Authentication
  login: { en: 'Login', ja: 'ログイン' },
  signup: { en: 'Sign Up', ja: '新規登録' },
  logout: { en: 'Logout', ja: 'ログアウト' },
  email: { en: 'Email', ja: 'メールアドレス' },
  password: { en: 'Password', ja: 'パスワード' },
  confirm_password: { en: 'Confirm Password', ja: 'パスワード確認' },
  verification_code: { en: 'Verification Code', ja: '認証コード' },
  send_code: { en: 'Send Code', ja: 'コード送信' },
  verify: { en: 'Verify', ja: '認証する' },
  forgot_password: { en: 'Forgot Password?', ja: 'パスワードを忘れた？' },

  // Navigation
  dashboard: { en: 'Dashboard', ja: 'ダッシュボード' },
  classes: { en: 'Classes', ja: 'クラス' },
  buy_tokens: { en: 'Buy Tokens', ja: 'トークン購入' },
  private_lesson: { en: 'Private Lesson', ja: 'プライベートレッスン' },
  music: { en: 'Music', ja: '音楽' },
  checkin: { en: 'Check-in', ja: 'チェックイン' },
  profile: { en: 'Profile', ja: 'プロフィール' },

  // Dashboard
  welcome: { en: 'Welcome', ja: 'ようこそ' },
  tokens_remaining: { en: 'Tokens Remaining', ja: '残りトークン' },
  upcoming_classes: { en: 'Upcoming Classes', ja: '次のクラス' },
  recent_activity: { en: 'Recent Activity', ja: '最近の活動' },
  notifications: { en: 'Notifications', ja: '通知' },

  // Classes
  browse_classes: { en: 'Browse Classes', ja: 'クラスを見る' },
  book_class: { en: 'Book Class', ja: 'クラス予約' },
  cancel_booking: { en: 'Cancel Booking', ja: '予約キャンセル' },
  class_details: { en: 'Class Details', ja: 'クラス詳細' },
  instructor: { en: 'Instructor', ja: 'インストラクター' },
  location: { en: 'Location', ja: '場所' },
  date_time: { en: 'Date & Time', ja: '日時' },
  available_spots: { en: 'Available Spots', ja: '空席' },
  full: { en: 'Full', ja: '満席' },

  // Tokens
  token_packages: { en: 'Token Packages', ja: 'トークンパッケージ' },
  purchase_tokens: { en: 'Purchase Tokens', ja: 'トークン購入' },
  token_history: { en: 'Token History', ja: 'トークン履歴' },
  tokens_used: { en: 'Tokens Used', ja: '使用済み' },
  tokens_purchased: { en: 'Tokens Purchased', ja: '購入済み' },

  // Private Lessons
  request_lesson: { en: 'Request Private Lesson', ja: 'プライベートレッスン予約' },
  lesson_date: { en: 'Preferred Date', ja: '希望日' },
  lesson_time: { en: 'Preferred Time', ja: '希望時間' },
  num_participants: { en: 'Number of Participants', ja: '参加人数' },
  lesson_notes: { en: 'Additional Notes', ja: '備考' },

  // Music
  music_store: { en: 'Music Store', ja: '音楽ストア' },
  browse_music: { en: 'Browse Music', ja: '音楽を見る' },
  purchase: { en: 'Purchase', ja: '購入' },
  purchased: { en: 'Purchased', ja: '購入済み' },
  preview: { en: 'Preview', ja: 'プレビュー' },

  // Check-in
  scan_qr: { en: 'Scan QR Code', ja: 'QRコードスキャン' },
  checkin_success: { en: 'Check-in Successful', ja: 'チェックイン成功' },
  checkin_failed: { en: 'Check-in Failed', ja: 'チェックイン失敗' },
  invalid_qr: { en: 'Invalid QR Code', ja: '無効なQRコード' },

  // Profile
  edit_profile: { en: 'Edit Profile', ja: 'プロフィール編集' },
  username: { en: 'Username', ja: 'ユーザー名' },
  change_password: { en: 'Change Password', ja: 'パスワード変更' },
  language: { en: 'Language', ja: '言語' },
  settings: { en: 'Settings', ja: '設定' },

  // Class Types
  class_type_workshop: { en: 'Workshop', ja: 'ワークショップ' },
  class_type_regular: { en: 'Regular Class', ja: '通常クラス' },
  class_type_intensive: { en: 'Intensive', ja: '集中クラス' },
  class_type_beginner: { en: 'Beginner', ja: '初心者' },
  class_type_intermediate: { en: 'Intermediate', ja: '中級' },
  class_type_advanced: { en: 'Advanced', ja: '上級' },
  class_type_private: { en: 'Private Lesson', ja: 'プライベートレッスン' },
  class_type_masterclass: { en: 'Master Class', ja: 'マスタークラス' },

  // Payment
  total: { en: 'Total', ja: '合計' },
  pay_now: { en: 'Pay Now', ja: '支払う' },
  payment_success: { en: 'Payment Successful', ja: '支払い成功' },
  payment_failed: { en: 'Payment Failed', ja: '支払い失敗' },
  processing: { en: 'Processing...', ja: '処理中...' },

  // Errors
  network_error: { en: 'Network error. Please try again.', ja: 'ネットワークエラー。もう一度お試しください。' },
  invalid_credentials: { en: 'Invalid email or password', ja: 'メールアドレスまたはパスワードが無効です' },
  password_mismatch: { en: 'Passwords do not match', ja: 'パスワードが一致しません' },
  required_field: { en: 'This field is required', ja: 'この項目は必須です' },
  
  // Boutique
  boutique: { en: 'Boutique', ja: 'ブティック' },
  shop_accessories: { en: 'Shop Accessories', ja: 'アクセサリー購入' },
  add_to_cart: { en: 'Add to Cart', ja: 'カートに追加' },
  cart: { en: 'Cart', ja: 'カート' },
  checkout: { en: 'Checkout', ja: '購入手続き' },
  shipping_info: { en: 'Shipping Information', ja: '配送情報' },
  place_order: { en: 'Place Order', ja: '注文する' },
  order_history: { en: 'Order History', ja: '注文履歴' },
  out_of_stock: { en: 'Out of Stock', ja: '在庫切れ' },
};

export const translations = {
  en: Object.keys(translationData).reduce((acc, key) => {
    acc[key as TranslationKey] = translationData[key as TranslationKey].en;
    return acc;
  }, {} as Record<TranslationKey, string>),
  ja: Object.keys(translationData).reduce((acc, key) => {
    acc[key as TranslationKey] = translationData[key as TranslationKey].ja;
    return acc;
  }, {} as Record<TranslationKey, string>),
};

export type TranslationKey = keyof typeof translationData;
export type Language = 'en' | 'ja';
