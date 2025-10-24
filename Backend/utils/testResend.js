// test-resend.js
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

console.log("Loaded API key:", process.env.RESEND_API_KEY ? "Found" : "Missing");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendTestEmail = async () => {
  try {
    const toEmail = "miraalsiro@gmail.com"; // <-- replace with your test email

    const result = await resend.emails.send({
      from: "support@crazydukaan.store", // domain you verified in Resend
      to: toEmail,
      subject: "Resend Test Email from Crazy Dukaan",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4F46E5;">Test Email Successful 🎉</h2>
          <p>If you're seeing this, your Resend API setup is working correctly!</p>
          <p><b>From:</b> support@crazydukaan.store</p>
          <p><b>To:</b> ${toEmail}</p>
          <p style="margin-top: 20px; color: gray;">Sent at ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    console.log("Email sent successfully!");
    console.log("Response:", result);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
};

sendTestEmail();
