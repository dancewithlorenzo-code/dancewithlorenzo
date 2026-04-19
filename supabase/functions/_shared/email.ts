export interface EmailReceipt {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(receipt: EmailReceipt): Promise<{ success: boolean; error: string | null }> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Dance with Lorenzo <receipts@updates.onspace.app>',
        to: receipt.to,
        subject: receipt.subject,
        html: receipt.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', errorData);
      return { success: false, error: `Email send failed: ${errorData}` };
    }

    const result = await response.json();
    console.log('Email sent successfully:', result.id);
    return { success: true, error: null };
  } catch (err) {
    console.error('Email sending error:', err);
    return { success: false, error: String(err) };
  }
}

// Email templates
export function createTokenPurchaseReceipt(
  customerEmail: string,
  customerName: string | null,
  quantity: number,
  amount: number,
  paymentDate: string
): EmailReceipt {
  const formattedAmount = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);

  const formattedDate = new Date(paymentDate).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    to: customerEmail,
    subject: `Receipt: Token Package Purchase - ${formattedAmount}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .receipt-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
            .receipt-row:last-child { border-bottom: none; font-weight: 600; font-size: 18px; }
            .label { color: #6b7280; }
            .value { color: #111827; font-weight: 500; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .highlight { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌺 Payment Receipt</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Dance with Lorenzo</p>
            </div>
            <div class="content">
              <p>Hi${customerName ? ` ${customerName}` : ''},</p>
              <p>Thank you for your purchase! Your payment has been successfully processed.</p>
              
              <div class="receipt-box">
                <h2 style="margin-top: 0; color: #1e3a8a;">Purchase Details</h2>
                <div class="receipt-row">
                  <span class="label">Item</span>
                  <span class="value">Token Package (${quantity} tokens)</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Date</span>
                  <span class="value">${formattedDate}</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Payment Method</span>
                  <span class="value">Credit Card</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Total Amount</span>
                  <span class="value">${formattedAmount}</span>
                </div>
              </div>

              <div class="highlight">
                <strong>🎉 Your tokens have been added to your account!</strong>
                <p style="margin: 8px 0 0 0;">You now have ${quantity} tokens available to book Become my Dancers classes.</p>
              </div>

              <div style="text-align: center;">
                <a href="https://your-app-url.com/classes" class="button">Browse Classes</a>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you have any questions about your purchase, please contact us at <a href="mailto:support@dancelorenzotokyo.com">support@dancelorenzotokyo.com</a>
              </p>
            </div>
            <div class="footer">
              <p>Dance with Lorenzo - Ori Tahiti Dance Workshops</p>
              <p>This is an automated receipt. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function createWorkshopBookingReceipt(
  customerEmail: string,
  customerName: string | null,
  classTitle: string,
  classDate: string,
  classTime: string,
  location: string | null,
  amount: number,
  paymentDate: string
): EmailReceipt {
  const formattedAmount = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);

  const formattedPaymentDate = new Date(paymentDate).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    to: customerEmail,
    subject: `Receipt & Booking Confirmation: ${classTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .receipt-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
            .receipt-row:last-child { border-bottom: none; }
            .label { color: #6b7280; }
            .value { color: #111827; font-weight: 500; }
            .total-row { font-weight: 600; font-size: 18px; padding-top: 16px; margin-top: 8px; border-top: 2px solid #e5e7eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .highlight { background: #dbeafe; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px; margin: 20px 0; }
            .class-info { background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fed7aa; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Booking Confirmed!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Dance with Lorenzo</p>
            </div>
            <div class="content">
              <p>Hi${customerName ? ` ${customerName}` : ''},</p>
              <p>Your workshop booking has been confirmed! We're excited to dance with you.</p>
              
              <div class="class-info">
                <h2 style="margin-top: 0; color: #ea580c;">📅 Workshop Details</h2>
                <p style="margin: 8px 0;"><strong>Class:</strong> ${classTitle}</p>
                <p style="margin: 8px 0;"><strong>Date:</strong> ${classDate}</p>
                <p style="margin: 8px 0;"><strong>Time:</strong> ${classTime}</p>
                ${location ? `<p style="margin: 8px 0;"><strong>Location:</strong> ${location}</p>` : ''}
              </div>

              <div class="receipt-box">
                <h2 style="margin-top: 0; color: #1e3a8a;">Payment Receipt</h2>
                <div class="receipt-row">
                  <span class="label">Workshop</span>
                  <span class="value">${classTitle}</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Payment Date</span>
                  <span class="value">${formattedPaymentDate}</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Payment Method</span>
                  <span class="value">Credit Card</span>
                </div>
                <div class="receipt-row total-row">
                  <span class="label">Total Paid</span>
                  <span class="value">${formattedAmount}</span>
                </div>
              </div>

              <div class="highlight">
                <strong>💡 What to Bring:</strong>
                <p style="margin: 8px 0 0 0;">Please arrive 10 minutes early. Bring comfortable dance clothes, water, and your enthusiasm!</p>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Questions? Contact us at <a href="mailto:support@dancelorenzotokyo.com">support@dancelorenzotokyo.com</a>
              </p>
            </div>
            <div class="footer">
              <p>Dance with Lorenzo - Ori Tahiti Dance Workshops</p>
              <p>This is an automated receipt. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function createGiftCardEmail(
  recipientEmail: string,
  recipientName: string | null,
  purchaserName: string | null,
  bundleName: string,
  credits: number,
  customMessage: string | null,
  redemptionCode: string,
  expiresAt: string
): EmailReceipt {
  const formattedExpiry = new Date(expiresAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    to: recipientEmail,
    subject: `🎁 You've received a gift card for Dance with Lorenzo!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .gift-card { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; border-radius: 12px; margin: 20px 0; border: 3px solid #f59e0b; text-align: center; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
            .gift-card h2 { margin: 0 0 10px 0; color: #92400e; font-size: 24px; }
            .gift-card .credits { font-size: 48px; font-weight: 700; color: #b45309; margin: 15px 0; }
            .redemption-code { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #f59e0b; }
            .redemption-code .label { color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            .redemption-code .code { font-size: 32px; font-weight: 700; color: #b45309; letter-spacing: 4px; font-family: 'Courier New', monospace; }
            .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .message-box .from { color: #6b7280; font-size: 14px; margin-bottom: 8px; }
            .message-box .text { color: #111827; font-style: italic; line-height: 1.8; }
            .instructions { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .instruction-step { display: flex; align-items: start; margin: 12px 0; }
            .step-number { background: #f59e0b; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-right: 12px; flex-shrink: 0; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .expiry { background: #fef3c7; padding: 12px; border-radius: 6px; text-align: center; color: #92400e; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎁 You've Received a Gift!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">Dance with Lorenzo</p>
            </div>
            <div class="content">
              <p>Hi${recipientName ? ` ${recipientName}` : ''},</p>
              <p>Great news! ${purchaserName || 'Someone special'} has sent you a gift card for Ori Tahiti dance workshops!</p>
              
              ${customMessage ? `
              <div class="message-box">
                <div class="from">Message from ${purchaserName || 'your friend'}:</div>
                <div class="text">"${customMessage}"</div>
              </div>
              ` : ''}

              <div class="gift-card">
                <h2>🌺 ${bundleName}</h2>
                <div class="credits">${credits}</div>
                <div style="color: #92400e; font-size: 18px; margin-top: -10px;">Workshop Credits</div>
              </div>

              <div class="redemption-code">
                <div class="label">Your Redemption Code</div>
                <div class="code">${redemptionCode}</div>
              </div>

              <div class="instructions">
                <h3 style="margin-top: 0; color: #92400e;">How to Redeem:</h3>
                <div class="instruction-step">
                  <div class="step-number">1</div>
                  <div>Download the Dance with Lorenzo app and create your account using this email address</div>
                </div>
                <div class="instruction-step">
                  <div class="step-number">2</div>
                  <div>Navigate to "Gift Cards" section in the app</div>
                </div>
                <div class="instruction-step">
                  <div class="step-number">3</div>
                  <div>Enter your redemption code: <strong>${redemptionCode}</strong></div>
                </div>
                <div class="instruction-step">
                  <div class="step-number">4</div>
                  <div>Start booking workshops and enjoy dancing!</div>
                </div>
              </div>

              <div class="expiry">
                <strong>⏰ Valid Until:</strong> ${formattedExpiry}
              </div>

              <div style="text-align: center;">
                <a href="https://your-app-url.com/redeem" class="button">Redeem Gift Card Now</a>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Questions? Contact us at <a href="mailto:support@dancelorenzotokyo.com">support@dancelorenzotokyo.com</a>
              </p>
            </div>
            <div class="footer">
              <p>Dance with Lorenzo - Ori Tahiti Dance Workshops</p>
              <p>This gift card is valid for one year from the date of purchase.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function sendExpirationEmail(
  recipientEmail: string,
  recipientName: string,
  requesterOrRecipientName: string,
  credits: number,
  role: 'requester' | 'recipient'
): Promise<{ success: boolean; error: string | null }> {
  const subject = role === 'requester'
    ? `Credit Request Expired - ${credits} credits`
    : `Credit Request from ${requesterOrRecipientName} Expired`;

  const html = role === 'requester'
    ? `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .notice-box { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Request Expired</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Dance with Lorenzo</p>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>Your credit request to ${requesterOrRecipientName} has expired after 7 days without a response.</p>
              
              <div class="notice-box">
                <h3 style="margin-top: 0; color: #dc2626;">Request Details</h3>
                <p style="margin: 8px 0;"><strong>Credits Requested:</strong> ${credits}</p>
                <p style="margin: 8px 0;"><strong>Recipient:</strong> ${requesterOrRecipientName}</p>
                <p style="margin: 8px 0;"><strong>Status:</strong> Expired (No response after 7 days)</p>
              </div>

              <p>You can submit a new request if you still need credits, or consider:</p>
              <ul>
                <li>Purchasing a workshop bundle package</li>
                <li>Requesting from a different friend</li>
                <li>Booking workshops individually</li>
              </ul>

              <div style="text-align: center;">
                <a href="https://your-app-url.com/credit-requests" class="button">Submit New Request</a>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Questions? Contact us at <a href="mailto:support@dancelorenzotokyo.com">support@dancelorenzotokyo.com</a>
              </p>
            </div>
            <div class="footer">
              <p>Dance with Lorenzo - Ori Tahiti Dance Workshops</p>
            </div>
          </div>
        </body>
      </html>
    `
    : `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .notice-box { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Request Expired</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Dance with Lorenzo</p>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>The credit request from ${requesterOrRecipientName} has expired after 7 days.</p>
              
              <div class="notice-box">
                <h3 style="margin-top: 0; color: #dc2626;">Request Details</h3>
                <p style="margin: 8px 0;"><strong>Credits Requested:</strong> ${credits}</p>
                <p style="margin: 8px 0;"><strong>From:</strong> ${requesterOrRecipientName}</p>
                <p style="margin: 8px 0;"><strong>Status:</strong> Automatically expired (7 days)</p>
              </div>

              <p>No action is needed. The request has been automatically cancelled.</p>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Questions? Contact us at <a href="mailto:support@dancelorenzotokyo.com">support@dancelorenzotokyo.com</a>
              </p>
            </div>
            <div class="footer">
              <p>Dance with Lorenzo - Ori Tahiti Dance Workshops</p>
            </div>
          </div>
        </body>
      </html>
    `;

  return sendEmail({ to: recipientEmail, subject, html });
}

export function createOrderStatusUpdateEmail(
  customerEmail: string,
  customerName: string | null,
  orderNumber: string,
  orderItems: Array<{ product_name: string; quantity: number; selected_size?: string | null }>,
  newStatus: 'processing' | 'shipped' | 'delivered',
  trackingNumber?: string | null
): EmailReceipt {
  const statusConfig = {
    processing: {
      icon: '⚙️',
      title: 'Order is Being Prepared',
      message: 'Great news! We\'ve started preparing your order. Your items will be shipped within 3-5 business days.',
      color: '#f59e0b',
    },
    shipped: {
      icon: '📦',
      title: 'Order Has Been Shipped',
      message: 'Your order is on its way! You should receive it within 5-7 business days.',
      color: '#3b82f6',
    },
    delivered: {
      icon: '✅',
      title: 'Order Delivered',
      message: 'Your order has been delivered! We hope you love your new dance accessories.',
      color: '#10b981',
    },
  };

  const config = statusConfig[newStatus];

  const itemsHtml = orderItems.map(item => {
    const sizeText = item.selected_size ? ` (${item.selected_size})` : '';
    return `<li style="margin-bottom: 8px;">${item.product_name}${sizeText} × ${item.quantity}</li>`;
  }).join('');

  return {
    to: customerEmail,
    subject: `${config.icon} Order Update: ${config.title}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .status-box { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; border: 3px solid ${config.color}; }
            .status-icon { font-size: 64px; margin-bottom: 16px; }
            .status-title { font-size: 24px; font-weight: 700; color: ${config.color}; margin-bottom: 12px; }
            .status-message { color: #4b5563; font-size: 16px; line-height: 1.8; }
            .order-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .order-box h3 { margin-top: 0; color: #111827; }
            .tracking-box { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            .tracking-number { font-size: 20px; font-weight: 700; color: #1e40af; font-family: 'Courier New', monospace; margin-top: 8px; }
            .items-list { list-style: none; padding: 0; margin: 16px 0; }
            .items-list li { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .timeline { margin: 20px 0; }
            .timeline-step { display: flex; align-items: center; margin: 12px 0; }
            .timeline-dot { width: 20px; height: 20px; border-radius: 50%; margin-right: 12px; }
            .timeline-dot.active { background: ${config.color}; }
            .timeline-dot.inactive { background: #e5e7eb; }
            .timeline-text { color: #4b5563; }
            .timeline-text.active { font-weight: 600; color: #111827; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${config.icon} Order Update</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Dance with Lorenzo Boutique</p>
            </div>
            <div class="content">
              <p>Hi${customerName ? ` ${customerName}` : ''},</p>
              
              <div class="status-box">
                <div class="status-icon">${config.icon}</div>
                <div class="status-title">${config.title}</div>
                <div class="status-message">${config.message}</div>
              </div>

              ${trackingNumber ? `
              <div class="tracking-box">
                <strong>📍 Tracking Information</strong>
                <div class="tracking-number">${trackingNumber}</div>
                <p style="margin: 12px 0 0 0; font-size: 14px; color: #4b5563;">Use this tracking number to monitor your shipment status with the delivery service.</p>
              </div>
              ` : ''}

              <div class="order-box">
                <h3>Order #${orderNumber.slice(0, 8)}</h3>
                <ul class="items-list">
                  ${itemsHtml}
                </ul>
              </div>

              <div class="timeline">
                <h3 style="color: #111827; margin-bottom: 16px;">📍 Order Timeline</h3>
                <div class="timeline-step">
                  <div class="timeline-dot active"></div>
                  <div class="timeline-text active">Order Placed & Paid</div>
                </div>
                <div class="timeline-step">
                  <div class="timeline-dot ${newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered' ? 'active' : 'inactive'}"></div>
                  <div class="timeline-text ${newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered' ? 'active' : ''}">Processing</div>
                </div>
                <div class="timeline-step">
                  <div class="timeline-dot ${newStatus === 'shipped' || newStatus === 'delivered' ? 'active' : 'inactive'}"></div>
                  <div class="timeline-text ${newStatus === 'shipped' || newStatus === 'delivered' ? 'active' : ''}">Shipped</div>
                </div>
                <div class="timeline-step">
                  <div class="timeline-dot ${newStatus === 'delivered' ? 'active' : 'inactive'}"></div>
                  <div class="timeline-text ${newStatus === 'delivered' ? 'active' : ''}">Delivered</div>
                </div>
              </div>

              ${newStatus === 'delivered' ? `
              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #92400e; font-size: 16px;">❤️ We hope you love your new items! Thank you for shopping with us.</p>
              </div>
              ` : ''}

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Questions about your order? Contact us at <a href="mailto:dancewithlorenzo@gmail.com">dancewithlorenzo@gmail.com</a>
              </p>
            </div>
            <div class="footer">
              <p>Dance with Lorenzo - Ori Tahiti Dance Boutique</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function sendReminderEmail(
  recipientEmail: string,
  recipientName: string,
  requesterName: string,
  credits: number,
  hoursRemaining: number,
  requestMessage?: string | null
): Promise<{ success: boolean; error: string | null }> {
  const daysRemaining = Math.ceil(hoursRemaining / 24);
  const urgency = hoursRemaining <= 30 ? 'Urgent' : 'Reminder';

  const subject = `${urgency}: Credit Request from ${requesterName} (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left)`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .urgent-box { background: ${hoursRemaining <= 30 ? '#fef2f2' : '#fffbeb'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${hoursRemaining <= 30 ? '#ef4444' : '#f59e0b'}; }
          .request-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .message-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; font-style: italic; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 8px; }
          .button-reject { background: #ef4444; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .timer { font-size: 36px; font-weight: 700; color: ${hoursRemaining <= 30 ? '#dc2626' : '#f59e0b'}; text-align: center; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${hoursRemaining <= 30 ? '⏰' : '⏳'} ${urgency}: Credit Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Dance with Lorenzo Tokyo</p>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>${requesterName} is waiting for your response to their credit request.</p>
            
            <div class="urgent-box">
              <h3 style="margin-top: 0; color: ${hoursRemaining <= 30 ? '#dc2626' : '#b45309'};">⏰ Time Remaining</h3>
              <div class="timer">${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</div>
              <p style="text-align: center; margin: 5px 0 0 0; color: #6b7280;">Request expires in approximately ${hoursRemaining} hours</p>
            </div>

            <div class="request-box">
              <h3 style="margin-top: 0; color: #1e3a8a;">Request Details</h3>
              <p style="margin: 8px 0;"><strong>From:</strong> ${requesterName}</p>
              <p style="margin: 8px 0;"><strong>Credits Requested:</strong> ${credits}</p>
              ${requestMessage ? `
              <div class="message-box">
                <p style="margin: 0;"><strong>Message:</strong></p>
                <p style="margin: 8px 0 0 0;">"${requestMessage}"</p>
              </div>
              ` : ''}
            </div>

            <p>${hoursRemaining <= 30 ? '<strong>This is your last chance to respond!</strong> ' : ''}The request will automatically expire if you don't respond within the time limit.</p>

            <div style="text-align: center;">
              <a href="https://your-app-url.com/credit-requests" class="button">Approve Request ✅</a>
              <a href="https://your-app-url.com/credit-requests" class="button button-reject">Decline Request ❌</a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Questions? Contact us at <a href="mailto:support@dancelorenzotokyo.com">support@dancelorenzotokyo.com</a>
            </p>
          </div>
          <div class="footer">
            <p>Dance with Lorenzo Tokyo - Ori Tahiti Dance Workshops</p>
            <p>Requests expire after 7 days to keep our community active.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({ to: recipientEmail, subject, html });
}

export function createOrderStatusUpdateEmail(
  customerEmail: string,
  customerName: string | null,
  orderNumber: string,
  orderItems: Array<{ product_name: string; quantity: number; selected_size?: string | null }>,
  newStatus: 'processing' | 'shipped' | 'delivered',
  trackingNumber?: string | null
): EmailReceipt {
  const statusConfig = {
    processing: {
      icon: '⚙️',
      title: 'Order is Being Prepared',
      message: 'Great news! We\'ve started preparing your order. Your items will be shipped within 3-5 business days.',
      color: '#f59e0b',
    },
    shipped: {
      icon: '📦',
      title: 'Order Has Been Shipped',
      message: 'Your order is on its way! You should receive it within 5-7 business days.',
      color: '#3b82f6',
    },
    delivered: {
      icon: '✅',
      title: 'Order Delivered',
      message: 'Your order has been delivered! We hope you love your new dance accessories.',
      color: '#10b981',
    },
  };

  const config = statusConfig[newStatus];

  const itemsHtml = orderItems.map(item => {
    const sizeText = item.selected_size ? ` (${item.selected_size})` : '';
    return `<li style="margin-bottom: 8px;">${item.product_name}${sizeText} × ${item.quantity}</li>`;
  }).join('');

  return {
    to: customerEmail,
    subject: `${config.icon} Order Update: ${config.title}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .status-box { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; border: 3px solid ${config.color}; }
            .status-icon { font-size: 64px; margin-bottom: 16px; }
            .status-title { font-size: 24px; font-weight: 700; color: ${config.color}; margin-bottom: 12px; }
            .status-message { color: #4b5563; font-size: 16px; line-height: 1.8; }
            .order-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .order-box h3 { margin-top: 0; color: #111827; }
            .tracking-box { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            .tracking-number { font-size: 20px; font-weight: 700; color: #1e40af; font-family: 'Courier New', monospace; margin-top: 8px; }
            .items-list { list-style: none; padding: 0; margin: 16px 0; }
            .items-list li { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .timeline { margin: 20px 0; }
            .timeline-step { display: flex; align-items: center; margin: 12px 0; }
            .timeline-dot { width: 20px; height: 20px; border-radius: 50%; margin-right: 12px; }
            .timeline-dot.active { background: ${config.color}; }
            .timeline-dot.inactive { background: #e5e7eb; }
            .timeline-text { color: #4b5563; }
            .timeline-text.active { font-weight: 600; color: #111827; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${config.icon} Order Update</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Dance with Lorenzo Boutique</p>
            </div>
            <div class="content">
              <p>Hi${customerName ? ` ${customerName}` : ''},</p>
              
              <div class="status-box">
                <div class="status-icon">${config.icon}</div>
                <div class="status-title">${config.title}</div>
                <div class="status-message">${config.message}</div>
              </div>

              ${trackingNumber ? `
              <div class="tracking-box">
                <strong>📍 Tracking Information</strong>
                <div class="tracking-number">${trackingNumber}</div>
                <p style="margin: 12px 0 0 0; font-size: 14px; color: #4b5563;">Use this tracking number to monitor your shipment status with the delivery service.</p>
              </div>
              ` : ''}

              <div class="order-box">
                <h3>Order #${orderNumber.slice(0, 8)}</h3>
                <ul class="items-list">
                  ${itemsHtml}
                </ul>
              </div>

              <div class="timeline">
                <h3 style="color: #111827; margin-bottom: 16px;">📍 Order Timeline</h3>
                <div class="timeline-step">
                  <div class="timeline-dot active"></div>
                  <div class="timeline-text active">Order Placed & Paid</div>
                </div>
                <div class="timeline-step">
                  <div class="timeline-dot ${newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered' ? 'active' : 'inactive'}"></div>
                  <div class="timeline-text ${newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered' ? 'active' : ''}">Processing</div>
                </div>
                <div class="timeline-step">
                  <div class="timeline-dot ${newStatus === 'shipped' || newStatus === 'delivered' ? 'active' : 'inactive'}"></div>
                  <div class="timeline-text ${newStatus === 'shipped' || newStatus === 'delivered' ? 'active' : ''}">Shipped</div>
                </div>
                <div class="timeline-step">
                  <div class="timeline-dot ${newStatus === 'delivered' ? 'active' : 'inactive'}"></div>
                  <div class="timeline-text ${newStatus === 'delivered' ? 'active' : ''}">Delivered</div>
                </div>
              </div>

              ${newStatus === 'delivered' ? `
              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #92400e; font-size: 16px;">❤️ We hope you love your new items! Thank you for shopping with us.</p>
              </div>
              ` : ''}

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Questions about your order? Contact us at <a href="mailto:dancewithlorenzo@gmail.com">dancewithlorenzo@gmail.com</a>
              </p>
            </div>
            <div class="footer">
              <p>Dance with Lorenzo - Ori Tahiti Dance Boutique</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function createBoutiqueOrderReceipt(
  customerEmail: string,
  customerName: string | null,
  orderItems: Array<{ product_name: string; quantity: number; price_at_purchase: number }>,
  shippingAddress: string,
  totalAmount: number,
  orderDate: string
): EmailReceipt {
  const formattedAmount = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(totalAmount);

  const formattedDate = new Date(orderDate).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemsHtml = orderItems.map(item => {
    const itemPrice = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(item.price_at_purchase * item.quantity);
    
    return `
      <div class="receipt-row">
        <span class="label">${item.product_name} × ${item.quantity}</span>
        <span class="value">${itemPrice}</span>
      </div>
    `;
  }).join('');

  return {
    to: customerEmail,
    subject: `Order Receipt - Dance with Lorenzo Boutique`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .receipt-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
            .receipt-row:last-child { border-bottom: none; }
            .label { color: #6b7280; }
            .value { color: #111827; font-weight: 500; }
            .total-row { font-weight: 600; font-size: 18px; padding-top: 16px; margin-top: 8px; border-top: 2px solid #e5e7eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .shipping-box { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0; }
            .status-box { background: #dbeafe; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛍️ Order Confirmed!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Dance with Lorenzo Boutique</p>
            </div>
            <div class="content">
              <p>Hi${customerName ? ` ${customerName}` : ''},</p>
              <p>Thank you for your boutique order! Your payment has been received and your order is being processed.</p>
              
              <div class="status-box">
                <strong>📦 Order Status: Processing</strong>
                <p style="margin: 8px 0 0 0;">Your order will be prepared and shipped within 3-5 business days.</p>
              </div>

              <div class="receipt-box">
                <h2 style="margin-top: 0; color: #ec4899;">Order Details</h2>
                ${itemsHtml}
                <div class="receipt-row total-row">
                  <span class="label">Total Paid</span>
                  <span class="value">${formattedAmount}</span>
                </div>
              </div>

              <div class="shipping-box">
                <h3 style="margin-top: 0; color: #b45309;">📍 Shipping Address</h3>
                <p style="margin: 8px 0; white-space: pre-line;">${shippingAddress}</p>
              </div>

              <div class="receipt-box">
                <h3 style="margin-top: 0; color: #1e3a8a;">Payment Information</h3>
                <div class="receipt-row">
                  <span class="label">Order Date</span>
                  <span class="value">${formattedDate}</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Payment Method</span>
                  <span class="value">Credit Card</span>
                </div>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Questions about your order? Contact us at <a href="mailto:dancewithlorenzo@gmail.com">dancewithlorenzo@gmail.com</a>
              </p>
            </div>
            <div class="footer">
              <p>Dance with Lorenzo - Ori Tahiti Dance Boutique</p>
              <p>This is an automated receipt. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function createStockAlertEmail(
  customerEmail: string,
  customerName: string | null,
  productName: string,
  productImageUrl: string | null,
  productPrice: number,
  productUrl: string,
  requestedSize?: string
): EmailReceipt {
  const formattedPrice = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(productPrice);

  return {
    to: customerEmail,
    subject: `🎉 Back in Stock: ${productName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .product-box { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; border: 2px solid #10b981; }
            .product-image { width: 100%; max-width: 300px; height: auto; border-radius: 8px; margin-bottom: 16px; }
            .product-name { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 8px; }
            .product-price { font-size: 28px; font-weight: 700; color: #10b981; margin-bottom: 16px; }
            .size-badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 6px; font-weight: 600; margin-bottom: 16px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 700; font-size: 16px; }
            .urgency-box { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Good News!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">Your Requested Item is Back!</p>
            </div>
            <div class="content">
              <p>Hi${customerName ? ` ${customerName}` : ''},</p>
              <p>Great news! The item you requested a stock alert for is now back in stock and ready to order.</p>
              
              <div class="product-box">
                ${productImageUrl ? `<img src="${productImageUrl}" alt="${productName}" class="product-image" />` : ''}
                <div class="product-name">${productName}</div>
                ${requestedSize ? `<div class="size-badge">Size: ${requestedSize}</div>` : ''}
                <div class="product-price">${formattedPrice}</div>
                <a href="${productUrl}" class="button">Shop Now 🛍️</a>
              </div>

              <div class="urgency-box">
                <strong>⚡ Act Fast!</strong>
                <p style="margin: 8px 0 0 0;">Popular items sell out quickly. Don't miss your chance to grab this item before it's gone again!</p>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This notification was sent because you requested to be notified when this item became available. You will not receive further alerts for this product unless you sign up again.
              </p>
            </div>
            <div class="footer">
              <p>Dance with Lorenzo - Ori Tahiti Dance Boutique</p>
              <p>Questions? Contact us at <a href="mailto:dancewithlorenzo@gmail.com">dancewithlorenzo@gmail.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function createPrivateLessonReceipt(
  customerEmail: string,
  customerName: string | null,
  lessonDate: string,
  lessonTime: string,
  numParticipants: number,
  amount: number,
  paymentDate: string
): EmailReceipt {
  const formattedAmount = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);

  const formattedPaymentDate = new Date(paymentDate).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    to: customerEmail,
    subject: `Receipt & Confirmation: Private Lesson - ${lessonDate}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .receipt-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
            .receipt-row:last-child { border-bottom: none; }
            .label { color: #6b7280; }
            .value { color: #111827; font-weight: 500; }
            .total-row { font-weight: 600; font-size: 18px; padding-top: 16px; margin-top: 8px; border-top: 2px solid #e5e7eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .highlight { background: #faf5ff; padding: 15px; border-left: 4px solid #a78bfa; border-radius: 4px; margin: 20px 0; }
            .lesson-info { background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #a7f3d0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Private Lesson Confirmed!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Dance with Lorenzo</p>
            </div>
            <div class="content">
              <p>Hi${customerName ? ` ${customerName}` : ''},</p>
              <p>Your private lesson has been confirmed! Lorenzo is looking forward to working with you.</p>
              
              <div class="lesson-info">
                <h2 style="margin-top: 0; color: #059669;">📅 Lesson Details</h2>
                <p style="margin: 8px 0;"><strong>Date:</strong> ${lessonDate}</p>
                <p style="margin: 8px 0;"><strong>Time:</strong> ${lessonTime}</p>
                <p style="margin: 8px 0;"><strong>Participants:</strong> ${numParticipants} ${numParticipants === 1 ? 'person' : 'people'}</p>
                <p style="margin: 8px 0;"><strong>Instructor:</strong> Lorenzo</p>
              </div>

              <div class="receipt-box">
                <h2 style="margin-top: 0; color: #7c3aed;">Payment Receipt</h2>
                <div class="receipt-row">
                  <span class="label">Service</span>
                  <span class="value">Private Lesson (${numParticipants} ${numParticipants === 1 ? 'person' : 'people'})</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Lesson Date</span>
                  <span class="value">${lessonDate} at ${lessonTime}</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Payment Date</span>
                  <span class="value">${formattedPaymentDate}</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Payment Method</span>
                  <span class="value">Credit Card</span>
                </div>
                <div class="receipt-row total-row">
                  <span class="label">Total Paid</span>
                  <span class="value">${formattedAmount}</span>
                </div>
              </div>

              <div class="highlight">
                <strong>📝 Next Steps:</strong>
                <p style="margin: 8px 0 0 0;">Lorenzo will contact you within 24 hours to confirm the location and discuss your lesson goals.</p>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Questions or need to reschedule? Contact us at <a href="mailto:support@dancelorenzotokyo.com">support@dancelorenzotokyo.com</a>
              </p>
            </div>
            <div class="footer">
              <p>Dance with Lorenzo - Ori Tahiti Dance Workshops</p>
              <p>This is an automated receipt. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}
