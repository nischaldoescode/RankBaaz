import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Generates a 6-digit OTP code
 * @returns {string} The generated OTP code
 */
export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Sends an OTP email to the specified email address
 * @param {string} email - Recipient's email address
 * @param {string} otp - OTP code to send
 * @returns {Promise<boolean>}
 */
export const sendOtpEmail = async (
  email,
  otp,
  siteName = "Test App",
  logoUrl = null
) => {
  try {
    // Check which email service to use based on environment variable
    const isGoDaddy = process.env.EMAIL_SERVICE === "godaddy";

    let transportConfig;

    if (isGoDaddy) {
      // GoDaddy SMTP Configuration
      const smtpPort = parseInt(process.env.SMTP_PORT) || 587; // Default to 587

      transportConfig = {
        host: "smtpout.secureserver.net",
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for 587
        requireTLS: smtpPort === 587, // enforce TLS for port 587
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: "TLSv1.2",
          ciphers: "HIGH:MEDIUM:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK",
        },
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 15000,
        socketTimeout: 15000,
        logger: true, // Enable logging
        debug: process.env.NODE_ENV === "production", // Debug only in dev
      };

      console.log(
        `[EMAIL] GoDaddy SMTP config - Host: smtpout.secureserver.net, Port: ${smtpPort}, User: ${process.env.EMAIL_USER}`
      );
    } else {
      // Gmail Configuration (fallback for local development)
      transportConfig = {
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
      };

      console.log(`[EMAIL] Using Gmail SMTP: ${process.env.EMAIL_USER}`);
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Verify transporter configuration
    // Verify transporter configuration
    try {
      console.log("[EMAIL] Attempting SMTP verification...");
      await transporter.verify();
      console.log("[EMAIL] SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("[EMAIL] SMTP verification failed");
      console.error("[EMAIL] Error code:", verifyError.code);
      console.error("[EMAIL] Error syscall:", verifyError.syscall);
      console.error("[EMAIL] Error message:", verifyError.message);

      // Specific error messages
      if (verifyError.code === "ETIMEDOUT" || verifyError.code === "ESOCKET") {
        throw new Error(
          `SMTP connection timeout - Port ${transportConfig.port} may be blocked by hosting provider`
        );
      } else if (verifyError.code === "EAUTH") {
        throw new Error("SMTP authentication failed - Check email credentials");
      } else if (verifyError.code === "ECONNREFUSED") {
        throw new Error("SMTP connection refused - Check host and port");
      } else {
        throw new Error(`SMTP error: ${verifyError.message}`);
      }
    }

    // Logo section - use image if provided, otherwise use text
    const logoSection = logoUrl
      ? `<img src="${logoUrl}" alt="${siteName} Logo" style="max-width: 150px; height: auto;" />`
      : `<h1 style="margin: 0; color: #333; font-size: 24px;">${siteName}</h1>`;

    const mailOptions = {
      from: `"${siteName}" <${process.env.EMAIL_USER}>`, // Better formatting
      to: email,
      subject: `Your OTP Code for ${siteName}`,
      html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">

                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                                        ${logoSection}
                                        <p style="margin: 20px 0 0 0; color: #ffffff; font-size: 16px;">
                                            You've requested a One-Time Password (OTP) for your account.
                                        </p>
                                    </td>
                                </tr>

                                <!-- Body -->
                                <tr>
                                    <td style="padding: 40px 20px;">

                                        <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; text-align: center;">
                                            Here's your verification code:
                                        </p>

                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center">
                                                    <div style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; display: inline-block;">
                                                        <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${otp}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>

                                        <p style="margin: 30px 0 0 0; color: #999; font-size: 14px; text-align: center;">
                                            This code is valid for ${process.env.OTP_EXPIRY_MINUTES || 5} minutes.
                                        </p>

                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                                        <p style="margin: 0 0 10px 0; color: #999; font-size: 14px;">
                                            If you didn't request this code, please ignore this email.
                                        </p>
                                        <p style="margin: 0; color: #999; font-size: 12px;">
                                            © ${new Date().getFullYear()} ${siteName}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>
                </table>

            </body>
            </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `[EMAIL] OTP sent successfully to ${email}, MessageID: ${info.messageId}`
    );
    return true;
  } catch (error) {
    console.error("[EMAIL] Error sending OTP:", error);
    console.error("[EMAIL] Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });

    if (error.message.includes("timeout")) {
      throw new Error(
        `Email service timeout - Port may be blocked. ${error.message}`
      );
    } else if (error.message.includes("authentication")) {
      throw new Error("Email authentication failed - Invalid credentials");
    } else {
      throw new Error(`Email sending failed: ${error.message}`);
    }
    throw new Error("Failed to send OTP. Please try again later.");
  }
};

/**
 * Validates OTP format
 * @param {string} otp - OTP to validate
 * @returns {boolean}
 */
export const validateOtpFormat = (otp) => {
  return /^\d{6}$/.test(otp);
};

/**
 * Checks if OTP has expired
 * @param {Date} expiresAt - OTP expiration date
 * @returns {boolean}
 */
export const isOtpExpired = (expiresAt) => {
  return new Date() > expiresAt;
};
