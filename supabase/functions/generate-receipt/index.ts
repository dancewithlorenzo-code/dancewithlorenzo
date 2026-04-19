import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';

interface ReceiptRequest {
  paymentId: string;
  paymentType: 'bundle' | 'private_lesson' | 'workshop' | 'music';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId, paymentType }: ReceiptRequest = await req.json();

    console.log(`Generating receipt for ${paymentType} payment ${paymentId}`);

    // Generate unique receipt number
    const receiptNumber = `DWLT-${Date.now()}-${paymentType.substring(0, 3).toUpperCase()}`;

    let receiptData: any = null;
    let emailHtml = '';
    let emailSubject = '';
    let recipientEmail = '';
    let recipientName = '';

    // Fetch payment details based on type
    switch (paymentType) {
      case 'bundle': {
        const { data: bundle } = await supabaseClient
          .from('workshop_bundles')
          .select(`
            *,
            user:user_profiles!workshop_bundles_user_id_fkey(email, username, language)
          `)
          .eq('id', paymentId)
          .single();

        if (!bundle) throw new Error('Bundle not found');

        receiptData = {
          user_id: bundle.user_id,
          payment_id: paymentId,
          payment_type: 'bundle',
          receipt_number: receiptNumber,
          amount: bundle.discounted_price,
          payment_method: 'Manual Payment',
          transaction_date: bundle.created_at,
          sent_to_email: bundle.user.email,
        };

        recipientEmail = bundle.user.email;
        recipientName = bundle.user.username || '';
        const isJapanese = bundle.user.language === 'ja';

        emailSubject = isJapanese
          ? `領収書: ワークショップバンドル - ¥${bundle.discounted_price.toLocaleString()}`
          : `Receipt: Workshop Bundle - ¥${bundle.discounted_price.toLocaleString()}`;

        const formattedDate = new Date(bundle.created_at).toLocaleString(isJapanese ? 'ja-JP' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .header p { margin: 10px 0 0 0; opacity: 0.95; font-size: 16px; }
    .content { padding: 40px 30px; background: #f9fafb; }
    .receipt-number { background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #fbbf24; }
    .receipt-number-label { color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .receipt-number-value { color: #b45309; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px; }
    .receipt-box { background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .receipt-box h2 { margin: 0 0 20px 0; color: #1e3a8a; font-size: 20px; }
    .receipt-row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #f3f4f6; }
    .receipt-row:last-child { border-bottom: none; }
    .label { color: #6b7280; font-size: 14px; }
    .value { color: #111827; font-weight: 600; font-size: 14px; text-align: right; }
    .total-row { font-weight: 700; font-size: 20px; padding-top: 20px; margin-top: 12px; border-top: 3px solid #3b82f6; }
    .total-row .value { color: #3b82f6; }
    .highlight { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
    .highlight strong { color: #1e40af; display: block; margin-bottom: 8px; font-size: 16px; }
    .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 13px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 5px 0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧾 ${isJapanese ? '領収書' : 'Payment Receipt'}</h1>
      <p>Dance with Lorenzo</p>
    </div>
    <div class="content">
      <p>${isJapanese ? 'こんにちは' : 'Hi'}${recipientName ? ` ${recipientName}` : ''},</p>
      <p>${isJapanese ? 'お支払いいただきありがとうございます。領収書は以下の通りです。' : 'Thank you for your payment! Here is your official receipt.'}</p>
      
      <div class="receipt-number">
        <div class="receipt-number-label">${isJapanese ? '領収書番号' : 'RECEIPT NUMBER'}</div>
        <div class="receipt-number-value">${receiptNumber}</div>
      </div>

      <div class="receipt-box">
        <h2>${isJapanese ? 'お支払い明細' : 'Payment Details'}</h2>
        <div class="receipt-row">
          <span class="label">${isJapanese ? '商品' : 'Item'}</span>
          <span class="value">${bundle.bundle_type} ${isJapanese ? 'ワークショップバンドル' : 'Workshop Bundle'}</span>
        </div>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'クレジット' : 'Credits'}</span>
          <span class="value">${bundle.total_credits} ${isJapanese ? 'クレジット' : 'credits'}</span>
        </div>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'お支払い日' : 'Payment Date'}</span>
          <span class="value">${formattedDate}</span>
        </div>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'お支払い方法' : 'Payment Method'}</span>
          <span class="value">${isJapanese ? '銀行振込/現金' : 'Bank Transfer / Cash'}</span>
        </div>
        <div class="receipt-row total-row">
          <span class="label">${isJapanese ? '合計金額' : 'Total Amount'}</span>
          <span class="value">¥${bundle.discounted_price.toLocaleString()}</span>
        </div>
      </div>

      <div class="highlight">
        <strong>${isJapanese ? '🎉 クレジットが追加されました！' : '🎉 Credits Added to Your Account!'}</strong>
        <p style="margin: 0;">${isJapanese ? `アカウントに${bundle.total_credits}クレジットが追加されました。ワークショップの予約にご利用ください！` : `You now have ${bundle.total_credits} credits available to book workshops!`}</p>
      </div>

      <div style="text-align: center;">
        <a href="https://your-app-url.com/classes" class="button">${isJapanese ? 'クラスを見る' : 'Browse Classes'}</a>
      </div>

      <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
        ${isJapanese ? 'ご質問がございましたら、' : 'Questions? Contact us at'} <a href="mailto:support@dancelorenzotokyo.com">support@dancelorenzotokyo.com</a>
      </p>
    </div>
    <div class="footer">
      <p><strong>Dance with Lorenzo</strong></p>
      <p>${isJapanese ? 'オリタヒチダンスワークショップ' : 'Ori Tahiti Dance Workshops'}</p>
      <p>${isJapanese ? 'この領収書は自動生成されたものです。' : 'This is an automated receipt. Please do not reply.'}</p>
    </div>
  </div>
</body>
</html>`;
        break;
      }

      case 'private_lesson': {
        const { data: lesson } = await supabaseClient
          .from('private_lessons')
          .select(`
            *,
            user:user_profiles!private_lessons_user_id_fkey(email, username, language)
          `)
          .eq('id', paymentId)
          .single();

        if (!lesson) throw new Error('Private lesson not found');

        receiptData = {
          user_id: lesson.user_id,
          payment_id: paymentId,
          payment_type: 'private_lesson',
          receipt_number: receiptNumber,
          amount: lesson.total_price,
          payment_method: 'Manual Payment',
          transaction_date: lesson.paid_at || new Date().toISOString(),
          sent_to_email: lesson.user.email,
        };

        recipientEmail = lesson.user.email;
        recipientName = lesson.user.username || '';
        const isJapanese = lesson.user.language === 'ja';

        emailSubject = isJapanese
          ? `領収書: プライベートレッスン - ¥${lesson.total_price.toLocaleString()}`
          : `Receipt: Private Lesson - ¥${lesson.total_price.toLocaleString()}`;

        const formattedDate = new Date(lesson.paid_at || new Date()).toLocaleString(isJapanese ? 'ja-JP' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .receipt-number { background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #fbbf24; }
    .receipt-number-label { color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .receipt-number-value { color: #b45309; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px; }
    .content { padding: 40px 30px; background: #f9fafb; }
    .receipt-box { background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .receipt-box h2 { margin: 0 0 20px 0; color: #7c3aed; font-size: 20px; }
    .receipt-row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #f3f4f6; }
    .receipt-row:last-child { border-bottom: none; }
    .total-row { font-weight: 700; font-size: 20px; padding-top: 20px; margin-top: 12px; border-top: 3px solid #a78bfa; }
    .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 13px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧾 ${isJapanese ? '領収書' : 'Payment Receipt'}</h1>
      <p>Dance with Lorenzo</p>
    </div>
    <div class="content">
      <p>${isJapanese ? 'こんにちは' : 'Hi'}${recipientName ? ` ${recipientName}` : ''},</p>
      <p>${isJapanese ? 'プライベートレッスンのお支払いを確認しました。領収書は以下の通りです。' : 'Your private lesson payment has been confirmed. Here is your receipt.'}</p>
      
      <div class="receipt-number">
        <div class="receipt-number-label">${isJapanese ? '領収書番号' : 'RECEIPT NUMBER'}</div>
        <div class="receipt-number-value">${receiptNumber}</div>
      </div>

      <div class="receipt-box">
        <h2>${isJapanese ? 'お支払い明細' : 'Payment Details'}</h2>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'サービス' : 'Service'}</span>
          <span class="value">${isJapanese ? 'プライベートレッスン' : 'Private Lesson'} (${lesson.num_participants} ${lesson.num_participants === 1 ? (isJapanese ? '名' : 'person') : (isJapanese ? '名' : 'people')})</span>
        </div>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'レッスン日' : 'Lesson Date'}</span>
          <span class="value">${lesson.requested_date} ${lesson.requested_time}</span>
        </div>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'お支払い日' : 'Payment Date'}</span>
          <span class="value">${formattedDate}</span>
        </div>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'お支払い方法' : 'Payment Method'}</span>
          <span class="value">${isJapanese ? '銀行振込/現金' : 'Bank Transfer / Cash'}</span>
        </div>
        <div class="receipt-row total-row">
          <span class="label">${isJapanese ? '合計金額' : 'Total Amount'}</span>
          <span class="value">¥${lesson.total_price.toLocaleString()}</span>
        </div>
      </div>

      <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
        ${isJapanese ? 'ご質問がございましたら、' : 'Questions? Contact us at'} <a href="mailto:support@dancelorenzotokyo.com">support@dancelorenzotokyo.com</a>
      </p>
    </div>
    <div class="footer">
      <p><strong>Dance with Lorenzo</strong></p>
      <p>${isJapanese ? 'この領収書は自動生成されたものです。' : 'This is an automated receipt.'}</p>
    </div>
  </div>
</body>
</html>`;
        break;
      }

      case 'workshop': {
        const { data: booking } = await supabaseClient
          .from('bookings')
          .select(`
            *,
            user:user_profiles!bookings_user_id_fkey(email, username, language),
            class:classes!bookings_class_id_fkey(title, start_time, location, class_type)
          `)
          .eq('id', paymentId)
          .single();

        if (!booking) throw new Error('Booking not found');

        receiptData = {
          user_id: booking.user_id,
          payment_id: paymentId,
          payment_type: 'workshop',
          receipt_number: receiptNumber,
          amount: booking.payment_amount,
          payment_method: booking.payment_method === 'token' ? 'Token' : 'Manual Payment',
          transaction_date: booking.created_at,
          sent_to_email: booking.user.email,
        };

        recipientEmail = booking.user.email;
        recipientName = booking.user.username || '';
        const isJapanese = booking.user.language === 'ja';

        emailSubject = isJapanese
          ? `領収書: ${booking.class.title}`
          : `Receipt: ${booking.class.title}`;

        const classDate = new Date(booking.class.start_time).toLocaleDateString(isJapanese ? 'ja-JP' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const classTime = new Date(booking.class.start_time).toLocaleTimeString(isJapanese ? 'ja-JP' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .receipt-number { background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #fbbf24; }
    .receipt-number-label { color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .receipt-number-value { color: #b45309; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px; }
    .content { padding: 40px 30px; background: #f9fafb; }
    .class-info { background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #a7f3d0; }
    .class-info h2 { margin: 0 0 12px 0; color: #065f46; font-size: 18px; }
    .receipt-box { background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .receipt-row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #f3f4f6; }
    .total-row { font-weight: 700; font-size: 20px; padding-top: 20px; margin-top: 12px; border-top: 3px solid #10b981; }
    .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 13px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧾 ${isJapanese ? '領収書' : 'Payment Receipt'}</h1>
      <p>Dance with Lorenzo</p>
    </div>
    <div class="content">
      <p>${isJapanese ? 'こんにちは' : 'Hi'}${recipientName ? ` ${recipientName}` : ''},</p>
      <p>${isJapanese ? 'ワークショップのお支払いを確認しました。領収書は以下の通りです。' : 'Your workshop payment has been confirmed. Here is your receipt.'}</p>
      
      <div class="receipt-number">
        <div class="receipt-number-label">${isJapanese ? '領収書番号' : 'RECEIPT NUMBER'}</div>
        <div class="receipt-number-value">${receiptNumber}</div>
      </div>

      <div class="class-info">
        <h2>📅 ${isJapanese ? 'ワークショップ詳細' : 'Workshop Details'}</h2>
        <p style="margin: 6px 0;"><strong>${isJapanese ? 'クラス' : 'Class'}:</strong> ${booking.class.title}</p>
        <p style="margin: 6px 0;"><strong>${isJapanese ? '日付' : 'Date'}:</strong> ${classDate}</p>
        <p style="margin: 6px 0;"><strong>${isJapanese ? '時間' : 'Time'}:</strong> ${classTime}</p>
        ${booking.class.location ? `<p style="margin: 6px 0;"><strong>${isJapanese ? '場所' : 'Location'}:</strong> ${booking.class.location}</p>` : ''}
      </div>

      <div class="receipt-box">
        <h2 style="margin: 0 0 20px 0; color: #059669;">${isJapanese ? 'お支払い明細' : 'Payment Details'}</h2>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'ワークショップ' : 'Workshop'}</span>
          <span class="value">${booking.class.title}</span>
        </div>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'お支払い方法' : 'Payment Method'}</span>
          <span class="value">${booking.payment_method === 'token' ? (isJapanese ? 'トークン' : 'Token') : (isJapanese ? '銀行振込/現金' : 'Bank Transfer / Cash')}</span>
        </div>
        <div class="receipt-row total-row">
          <span class="label">${isJapanese ? '合計金額' : 'Total Amount'}</span>
          <span class="value">${booking.payment_method === 'token' ? (isJapanese ? '1 トークン' : '1 Token') : `¥${booking.payment_amount.toLocaleString()}`}</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <p><strong>Dance with Lorenzo</strong></p>
      <p>${isJapanese ? 'この領収書は自動生成されたものです。' : 'This is an automated receipt.'}</p>
    </div>
  </div>
</body>
</html>`;
        break;
      }

      case 'music': {
        const { data: purchase } = await supabaseClient
          .from('music_purchases')
          .select(`
            *,
            user:user_profiles!music_purchases_user_id_fkey(email, username, language),
            product:music_products!music_purchases_product_id_fkey(title, product_type, artist)
          `)
          .eq('id', paymentId)
          .single();

        if (!purchase) throw new Error('Music purchase not found');

        receiptData = {
          user_id: purchase.user_id,
          payment_id: paymentId,
          payment_type: 'music',
          receipt_number: receiptNumber,
          amount: purchase.purchase_price,
          payment_method: 'Manual Payment',
          transaction_date: purchase.payment_confirmed_at || new Date().toISOString(),
          sent_to_email: purchase.user.email,
        };

        recipientEmail = purchase.user.email;
        recipientName = purchase.user.username || '';
        const isJapanese = purchase.user.language === 'ja';

        emailSubject = isJapanese
          ? `領収書: ${purchase.product.title} - ¥${purchase.purchase_price.toLocaleString()}`
          : `Receipt: ${purchase.product.title} - ¥${purchase.purchase_price.toLocaleString()}`;

        emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #9333ea 0%, #c084fc 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .receipt-number { background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #fbbf24; }
    .receipt-number-label { color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .receipt-number-value { color: #b45309; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px; }
    .content { padding: 40px 30px; background: #f9fafb; }
    .receipt-box { background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .receipt-row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #f3f4f6; }
    .total-row { font-weight: 700; font-size: 20px; padding-top: 20px; margin-top: 12px; border-top: 3px solid #c084fc; }
    .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 13px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎵 ${isJapanese ? '領収書' : 'Music Receipt'}</h1>
      <p>Dance with Lorenzo</p>
    </div>
    <div class="content">
      <p>${isJapanese ? 'こんにちは' : 'Hi'}${recipientName ? ` ${recipientName}` : ''},</p>
      <p>${isJapanese ? '音楽のご購入ありがとうございます！領収書は以下の通りです。' : 'Thank you for your music purchase! Here is your receipt.'}</p>
      
      <div class="receipt-number">
        <div class="receipt-number-label">${isJapanese ? '領収書番号' : 'RECEIPT NUMBER'}</div>
        <div class="receipt-number-value">${receiptNumber}</div>
      </div>

      <div class="receipt-box">
        <h2 style="margin: 0 0 20px 0; color: #9333ea;">${isJapanese ? 'お支払い明細' : 'Purchase Details'}</h2>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'タイトル' : 'Title'}</span>
          <span class="value">${purchase.product.title}</span>
        </div>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'アーティスト' : 'Artist'}</span>
          <span class="value">${purchase.product.artist}</span>
        </div>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'タイプ' : 'Type'}</span>
          <span class="value">${purchase.product.product_type.toUpperCase()}</span>
        </div>
        <div class="receipt-row">
          <span class="label">${isJapanese ? 'お支払い方法' : 'Payment Method'}</span>
          <span class="value">${isJapanese ? '銀行振込/現金' : 'Bank Transfer / Cash'}</span>
        </div>
        <div class="receipt-row total-row">
          <span class="label">${isJapanese ? '合計金額' : 'Total Amount'}</span>
          <span class="value">¥${purchase.purchase_price.toLocaleString()}</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <p><strong>Dance with Lorenzo</strong></p>
      <p>${isJapanese ? 'この領収書は自動生成されたものです。' : 'This is an automated receipt.'}</p>
    </div>
  </div>
</body>
</html>`;
        break;
      }

      default:
        throw new Error(`Unknown payment type: ${paymentType}`);
    }

    // Send email
    const { success, error: emailError } = await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    // Log receipt
    const { error: logError } = await supabaseClient.from('receipt_logs').insert({
      ...receiptData,
      success,
      error_message: emailError,
    });

    if (logError) {
      console.error('Failed to log receipt:', logError);
    }

    if (!success) {
      throw new Error(emailError || 'Failed to send email');
    }

    console.log(`Receipt ${receiptNumber} sent successfully to ${recipientEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        receiptNumber,
        message: 'Receipt generated and sent successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error generating receipt:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
