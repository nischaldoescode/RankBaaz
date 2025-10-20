import nodemailer from "nodemailer";

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
    const transporter = nodemailer.createTransport({
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
    });

    // Logo section - use image if provided, otherwise use text
    const logoSection = logoUrl
      ? `<img src="${logoUrl}" alt="${siteName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />`
      : `<h1 style="color: #333333; margin-bottom: 10px;">${siteName}</h1>`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Your OTP Code for ${siteName}`,
      html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: 'Arial', sans-serif;">
                <div style="text-align: center; margin-bottom: 20px;">
                    ${logoSection}
                    <p style="color: #666666; font-size: 16px;">
                        You've requested a One-Time Password (OTP) for your account.
                    </p>
                </div>
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 30px;">
                    <p style="color: #333333; font-size: 16px; margin-bottom: 15px;">
                        Here's your verification code:
                    </p>
                    <div style="background-color: white; border-radius: 6px; padding: 15px; display: inline-block; 
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 auto;">
                        <h2 style="font-size: 32px; letter-spacing: 5px; color: #007bff; margin: 0; font-weight: bold;">
                            ${otp}
                        </h2>
                    </div>
                    <p style="color: #666666; font-size: 14px; margin-top: 20px;">
                        This code is valid for <strong>${process.env.OTP_EXPIRY_MINUTES || 5} minutes</strong>.
                    </p>
                </div>
                <div style="text-align: center; color: #999999; font-size: 12px; padding-top: 20px; border-top: 1px solid #eeeeee;">
                    <p style="margin-bottom: 5px;">If you didn't request this code, please ignore this email.</p>
                    <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
                </div>
            </div>`,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending OTP:", error);
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
