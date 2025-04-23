// node_mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Create transporter using SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,      // Your Gmail address
    pass: process.env.GMAIL_PASS,    // Use App Password, not your actual Gmail password!
  },
});

// Send Email Function
export async function sendEmail({ to, subject, text, html }) {
  const mailOptions = {
    from: "edvora111@gmail.com",
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
