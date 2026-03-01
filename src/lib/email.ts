import { EmailClient, KnownEmailSendStatus } from '@azure/communication-email';
import { DefaultAzureCredential } from '@azure/identity';

const ACS_ENDPOINT = process.env.AZURE_COMMUNICATION_ENDPOINT;
// Azure マネージドドメインの送信元アドレス
const EMAIL_FROM = process.env.EMAIL_FROM_ADDRESS ?? 'DoNotReply@221dcd46-ec33-4e93-a0b8-af6901fbe821.azurecomm.net';

let _client: EmailClient | null = null;

function getEmailClient(): EmailClient | null {
  if (!ACS_ENDPOINT) {
    console.warn('[email] AZURE_COMMUNICATION_ENDPOINT が未設定のためメール送信をスキップします');
    return null;
  }
  if (!_client) {
    // Managed Identity（本番）または Azure CLI ログイン（ローカル開発）を自動選択
    _client = new EmailClient(`https://${ACS_ENDPOINT}`, new DefaultAzureCredential());
  }
  return _client;
}

export interface MatchSessionEmailPayload {
  recipientEmail: string;
  recipientName: string;
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  songTitle: string;
  venueName: string;
  locale?: 'ja' | 'en';
}

export async function sendMatchSessionEmail(payload: MatchSessionEmailPayload): Promise<boolean> {
  const client = getEmailClient();
  if (!client) return false;

  const { locale = 'ja' } = payload;
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://nearjam.app';
  const sessionUrl = `${appUrl}/${locale}/sessions/${payload.sessionId}`;

  const subject = locale === 'ja'
    ? `🎵 あなたのウィッシュリストの曲「${payload.songTitle}」が演奏されます`
    : `🎵 Your wish "${payload.songTitle}" is on the setlist`;

  const htmlBody = locale === 'ja'
    ? buildJaHtml(payload, sessionUrl)
    : buildEnHtml(payload, sessionUrl);

  const textBody = locale === 'ja'
    ? `「${payload.songTitle}」がセッション「${payload.sessionTitle}」で演奏予定です。\n詳細: ${sessionUrl}`
    : `"${payload.songTitle}" is on the setlist for "${payload.sessionTitle}".\nDetails: ${sessionUrl}`;

  try {
    const poller = await client.beginSend({
      senderAddress: `DoNotReply <${EMAIL_FROM}>`,
      recipients: {
        to: [{ address: payload.recipientEmail, displayName: payload.recipientName }],
      },
      content: { subject, html: htmlBody, plainText: textBody },
    });

    const result = await poller.pollUntilDone();
    if (result.status === KnownEmailSendStatus.Succeeded) {
      return true;
    }
    console.error('[email] 送信失敗:', result.error);
    return false;
  } catch (err) {
    console.error('[email] ACS Email エラー:', err);
    return false;
  }
}

function buildJaHtml(p: MatchSessionEmailPayload, sessionUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>NearJam マッチング通知</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="color:#4f46e5">🎵 ウィッシュリストの曲が見つかりました！</h2>
  <p>${p.recipientName} さん、こんにちは。</p>
  <p>
    あなたのウィッシュリストに登録した曲 <strong>「${p.songTitle}」</strong> が、
    近くのジャムセッションで演奏予定です。
  </p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0">
    <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;width:120px">セッション</td><td style="padding:8px">${p.sessionTitle}</td></tr>
    <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">日時</td><td style="padding:8px">${p.sessionDate}</td></tr>
    <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">会場</td><td style="padding:8px">${p.venueName}</td></tr>
  </table>
  <p style="margin-top:24px">
    <a href="${sessionUrl}" style="background:#4f46e5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
      セッションの詳細を見る
    </a>
  </p>
  <hr style="margin-top:32px;border:none;border-top:1px solid #eee">
  <p style="font-size:12px;color:#888">
    このメールは NearJam から自動送信されています。
    通知設定はプロフィールページから変更できます。
  </p>
</body>
</html>`;
}

function buildEnHtml(p: MatchSessionEmailPayload, sessionUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>NearJam Match Notification</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="color:#4f46e5">🎵 A song from your wishlist is on the setlist!</h2>
  <p>Hi ${p.recipientName},</p>
  <p>
    <strong>"${p.songTitle}"</strong> from your wishlist is scheduled to be performed
    at a nearby jam session.
  </p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0">
    <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;width:120px">Session</td><td style="padding:8px">${p.sessionTitle}</td></tr>
    <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Date</td><td style="padding:8px">${p.sessionDate}</td></tr>
    <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Venue</td><td style="padding:8px">${p.venueName}</td></tr>
  </table>
  <p style="margin-top:24px">
    <a href="${sessionUrl}" style="background:#4f46e5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
      View Session Details
    </a>
  </p>
  <hr style="margin-top:32px;border:none;border-top:1px solid #eee">
  <p style="font-size:12px;color:#888">
    This email was sent automatically by NearJam.
    You can manage your notification settings in your profile.
  </p>
</body>
</html>`;
}
