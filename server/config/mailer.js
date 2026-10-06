import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * sendMail — thin wrapper around Nodemailer.
 * Falls back to a console log in development so the server doesn't crash
 * when SMTP credentials aren't configured.
 */
export const sendMail = async (to, subject, html) => {
  if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_USER) {
    console.log(`[DEV MAIL] to: ${to} | subject: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
};

// ─── Email Templates ──────────────────────────────────────────────────────────

export const otpTemplate = (code) => `
  <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#17181A">
    <h1 style="font-size:20px;font-weight:700;margin-bottom:8px">CampusXchange</h1>
    <p style="font-size:14px;color:#555;margin-bottom:16px">
      Your verification code is:
    </p>
    <div style="font-family:monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#17181A;border:1px solid #C9C2B2;padding:16px;text-align:center;border-radius:4px">
      ${code}
    </div>
    <p style="font-size:12px;color:#888;margin-top:16px">
      Valid for 10 minutes. Do not share this code with anyone.
    </p>
  </div>
`;

export const verificationStatusTemplate = (status) => `
  <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#17181A">
    <h1 style="font-size:20px;font-weight:700;margin-bottom:8px">CampusXchange — Verification Update</h1>
    ${
      status === 'verified'
        ? `<p style="color:#3F6B3E;font-weight:600">✓ Your identity has been verified. You can now list and buy items.</p>`
        : status === 'rejected'
          ? `<p style="color:#B5482A;font-weight:600">Your verification was rejected. Upload a clearer ID card photo and try again.</p>`
          : `<p>Your ID card is under review. You'll hear back within 24 hours.</p>`
    }
  </div>
`;

export const receiptTemplate = ({ transaction, product, seller }) => `
  <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#17181A">
    <h1 style="font-size:20px;font-weight:700;margin-bottom:4px">CampusXchange — Purchase Receipt</h1>
    <p style="font-size:12px;font-family:monospace;color:#888;margin-bottom:16px">
      Order: ${transaction._id}
    </p>
    <div style="border:1px solid #C9C2B2;border-radius:4px;padding:16px;margin-bottom:16px">
      <p style="font-weight:600;font-size:14px;margin:0 0 4px">${product.title}</p>
      <p style="font-size:12px;color:#555;margin:0">₹${transaction.amount.toLocaleString('en-IN')}</p>
    </div>
    <h2 style="font-size:14px;font-weight:600">Pickup Details</h2>
    <p style="font-size:13px;color:#555">
      Location: ${transaction.pickupDetails?.location || 'To be arranged with seller'}<br/>
      Time: ${transaction.pickupDetails?.timeWindow || 'To be arranged with seller'}<br/>
      Seller: ${seller.name}
    </p>
    <p style="font-size:11px;color:#888;margin-top:16px">All handoffs are in-person, on campus.</p>
  </div>
`;

export const sellerSaleTemplate = ({ transaction, product, buyer }) => `
  <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#17181A">
    <h1 style="font-size:20px;font-weight:700;margin-bottom:8px">CampusXchange — Your item sold!</h1>
    <div style="border:1px solid #C9C2B2;border-radius:4px;padding:16px;margin-bottom:16px">
      <p style="font-weight:600;font-size:14px;margin:0 0 4px">${product.title}</p>
      <p style="font-size:12px;color:#555;margin:0">₹${transaction.amount.toLocaleString('en-IN')}</p>
    </div>
    <p style="font-size:13px;color:#555">
      Buyer: ${buyer.name}<br/>
      Arrange pickup with them at: ${transaction.pickupDetails?.location || 'TBD'}
    </p>
    <p style="font-size:11px;color:#888;margin-top:16px">
      Order: <span style="font-family:monospace">${transaction._id}</span>
    </p>
  </div>
`;
