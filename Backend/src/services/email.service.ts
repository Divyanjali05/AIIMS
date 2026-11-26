import net from 'net';
import tls from 'tls';
import { config } from '../config/env';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailSenderFn = (options: EmailOptions) => Promise<void>;

let mockSender: EmailSenderFn | null = null;

/**
 * Sets a mock email sender for automated testing or integration test suites.
 * Pass null to restore real SMTP sending.
 */
export function setMockEmailSender(fn: EmailSenderFn | null): void {
  mockSender = fn;
}

/**
 * Returns true if valid SMTP credentials and host are configured in the environment.
 */
export function isEmailConfigured(): boolean {
  if (mockSender) return true;
  return Boolean(
    config.smtpHost &&
    config.smtpHost.trim().length > 0 &&
    config.smtpUser &&
    config.smtpUser.trim().length > 0 &&
    config.smtpPass &&
    config.smtpPass.trim().length > 0
  );
}

/**
 * Low-level SMTP client using Node.js built-in net and tls modules.
 * Dependency-free, secure, and supports SSL (465) or STARTTLS (587).
 */
async function sendViaSmtp(options: EmailOptions): Promise<void> {
  const host = config.smtpHost.trim();
  const port = config.smtpPort;
  const user = config.smtpUser.trim();
  const pass = config.smtpPass.trim();
  const from = config.smtpFrom;

  return new Promise<void>((resolve, reject) => {
    let socket: net.Socket | tls.TLSSocket;
    let step = 0;
    let buffer = '';
    const timeoutMs = 15000;

    const timer = setTimeout(() => {
      socket.destroy();
      reject(
        new Error(`SMTP connection timed out after ${timeoutMs}ms connecting to ${host}:${port}`)
      );
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      if (!socket.destroyed) {
        socket.end();
      }
    }

    function sendCommand(cmd: string) {
      if (!socket.destroyed) {
        socket.write(cmd + '\r\n');
      }
    }

    function handleResponse(data: string) {
      buffer += data;
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const code = parseInt(line.substring(0, 3), 10);
        const isLastLine = line.charAt(3) !== '-';

        if (!isLastLine) continue;

        if (code >= 400 && step < 10) {
          cleanup();
          return reject(new Error(`SMTP error (${code}): ${line}`));
        }

        switch (step) {
          case 0: // Connected, waiting for 220
            if (code === 220) {
              step = 1;
              sendCommand('EHLO localhost');
            }
            break;

          case 1: // After EHLO
            if (code === 250) {
              if (!config.smtpSecure && port === 587) {
                step = 2;
                sendCommand('STARTTLS');
              } else {
                step = 4;
                sendCommand('AUTH LOGIN');
              }
            }
            break;

          case 2: // After STARTTLS 220
            if (code === 220) {
              const tlsSocket = tls.connect({
                socket: socket as net.Socket,
                host,
                servername: host,
                rejectUnauthorized: config.nodeEnv === 'production',
              });

              tlsSocket.on('error', (err) => {
                cleanup();
                reject(err);
              });

              tlsSocket.on('data', (d) => handleResponse(d.toString('utf8')));
              socket = tlsSocket;

              step = 3;
              sendCommand('EHLO localhost');
            }
            break;

          case 3: // After EHLO post-STARTTLS
            if (code === 250) {
              step = 4;
              sendCommand('AUTH LOGIN');
            }
            break;

          case 4: // Expecting 334 for Username
            if (code === 334) {
              step = 5;
              sendCommand(Buffer.from(user).toString('base64'));
            }
            break;

          case 5: // Expecting 334 for Password
            if (code === 334) {
              step = 6;
              sendCommand(Buffer.from(pass).toString('base64'));
            }
            break;

          case 6: // Auth successful 235
            if (code === 235) {
              step = 7;
              // Extract bare email address from from header
              const senderMatch = from.match(/<([^>]+)>/);
              const senderEmail = senderMatch ? senderMatch[1] : from;
              sendCommand(`MAIL FROM:<${senderEmail}>`);
            }
            break;

          case 7: // Mail from OK 250
            if (code === 250) {
              step = 8;
              sendCommand(`RCPT TO:<${options.to}>`);
            }
            break;

          case 8: // Rcpt to OK 250
            if (code === 250) {
              step = 9;
              sendCommand('DATA');
            }
            break;

          case 9: // Data ready 354
            if (code === 354) {
              step = 10;
              const dateStr = new Date().toUTCString();
              const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${host}>`;
              const mime = [
                `From: ${from}`,
                `To: ${options.to}`,
                `Subject: ${options.subject}`,
                `Date: ${dateStr}`,
                `Message-ID: ${messageId}`,
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=UTF-8',
                'Content-Transfer-Encoding: 7bit',
                '',
                options.html,
                '.',
              ].join('\r\n');

              sendCommand(mime);
            }
            break;

          case 10: // Message accepted 250
            if (code === 250) {
              step = 11;
              sendCommand('QUIT');
              cleanup();
              resolve();
            }
            break;
        }
      }
    }

    if (config.smtpSecure || port === 465) {
      socket = tls.connect(port, host, {
        servername: host,
        rejectUnauthorized: config.nodeEnv === 'production',
      });
    } else {
      socket = net.connect(port, host);
    }

    socket.on('error', (err) => {
      cleanup();
      reject(err);
    });

    socket.on('data', (d) => handleResponse(d.toString('utf8')));
  });
}

/**
 * Sends an email using configured SMTP or active mock sender.
 * Throws explicit error if credentials are not configured.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (mockSender) {
    return mockSender(options);
  }

  if (!isEmailConfigured()) {
    throw new Error(
      'Email provider is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.'
    );
  }

  return sendViaSmtp(options);
}

/**
 * Sends a branded 6-digit OTP email to the user.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your AIIMS Login Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="font-size: 26px; font-weight: 800; color: #5B4BFF; margin: 0; letter-spacing: -0.5px;">AIIMS</h1>
      <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">AI Intelligence & Mentoring System</p>
    </div>

    <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; margin-bottom: 24px;">
      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0;">Verify Your Email Address</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
        You are signing in to your AIIMS account. Please enter the single-use verification code below to complete your authentication:
      </p>

      <div style="text-align: center; margin: 28px 0; background: #f8faff; border: 2px dashed #5B4BFF; border-radius: 12px; padding: 20px;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #5B4BFF; display: inline-block;">
          ${otp}
        </span>
        <div style="font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 600;">
          Expires in 5 minutes • Single use only
        </div>
      </div>

      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 14px 16px; margin: 24px 0;">
        <p style="font-size: 12.5px; line-height: 1.5; color: #92400e; margin: 0;">
          <strong>Security Warning:</strong> If you did not attempt to sign in to AIIMS, please change your password immediately. Never share this code with anyone. AIIMS staff will never ask for your verification code.
        </p>
      </div>
    </div>

    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        © 2026 AIIMS Education. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    to,
    subject: `${otp} is your AIIMS login verification code`,
    html,
    text: `Your AIIMS login verification code is: ${otp}. It expires in 5 minutes. Do not share this code with anyone.`,
  });
}
