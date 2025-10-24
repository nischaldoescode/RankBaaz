import { Resend } from "resend";
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
  const startTime = Date.now();
  
  try {
    // Check which email service to use
    const emailService = process.env.EMAIL_SERVICE || "resend";
    
    console.log(`[EMAIL] Using service: ${emailService}`);
    console.log(`[EMAIL] Sending to: ${email}`);

    // Logo section
    const logoSection = logoUrl
      ? `<img src="${logoUrl}" alt="${siteName} Logo" style="max-width: 150px; height: auto;" />`
      : `<h1 style="margin: 0; color: #333; font-size: 24px;">${siteName}</h1>`;

    const htmlContent = `
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
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                            ${logoSection}
                            <p style="margin: 20px 0 0 0; color: #ffffff; font-size: 16px;">
                                You've requested a One-Time Password (OTP) for your account.
                            </p>
                        </td>
                    </tr>
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
</html>`;

    let messageId;

    if (emailService === "resend") {
      // RESEND API - FAST AND RELIABLE
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      console.log(`[EMAIL] Resend - From: ${process.env.EMAIL_USER}`);
      
      const data = await resend.emails.send({
        from: `${siteName} <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Your OTP Code for ${siteName}`,
        html: htmlContent,
      });

      messageId = data.id;
      console.log(`[EMAIL] Resend success - ID: ${messageId}`);
      
    }

    const duration = Date.now() - startTime;
    console.log(`[EMAIL] Total time: ${duration}ms`);

    return true;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error("[EMAIL] Send failed");
    console.error("[EMAIL] Error type:", error.name);
    console.error("[EMAIL] Error message:", error.message);
    console.error("[EMAIL] Time elapsed:", duration + "ms");

    if (error.code) {
      console.error("[EMAIL] Error code:", error.code);
    }
    if (error.statusCode) {
      console.error("[EMAIL] Status code:", error.statusCode);
    }

    // Specific error messages
    if (error.message?.includes("Invalid API key")) {
      throw new Error("Email service not configured - Invalid API key");
    } else if (error.message?.includes("timeout")) {
      throw new Error(`Email timeout after ${duration}ms - Port may be blocked`);
    } else if (error.message?.includes("authentication")) {
      throw new Error("Email authentication failed - Check credentials");
    } else {
      throw new Error(`Email failed: ${error.message}`);
    }
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