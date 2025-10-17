// config/nodemailer.js
import Sib from "@sendinblue/client";
import dotenv from "dotenv";

dotenv.config();

const client = new Sib.TransactionalEmailsApi();
client.setApiKey(Sib.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

export const sendMail = async (to, subject, htmlContent) => {
  try {
    const response = await client.sendTransacEmail({
      sender: { email: process.env.EMAIL_USER, name: "Clinigoal" },
      to: [{ email: to }],
      subject,
      htmlContent,
    });
    console.log("✅ Email sent:", response.messageId || response);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return false;
  }
};
