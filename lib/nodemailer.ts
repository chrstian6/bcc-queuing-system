// lib/nodemailer.ts
import nodemailer from "nodemailer";

// Email configuration with proper authentication
const getTransporterConfig = () => {
  const config = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true" || false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Add these options to improve deliverability
    tls: {
      rejectUnauthorized: false, // Only for development
      ciphers: "SSLv3",
    },
    pool: true, // Use pooled connections
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000, // 1 second between messages
    rateLimit: 5, // Max 5 messages per rateDelta
  };

  // Validate required fields
  if (!config.auth.user || !config.auth.pass) {
    console.warn(
      "SMTP credentials are not set. Email functionality will not work properly.",
    );
  }

  return config;
};

const transporter = nodemailer.createTransport(getTransporterConfig());

// Verify connection on startup
if (process.env.NODE_ENV === "production") {
  transporter.verify((error, success) => {
    if (error) {
      console.error("SMTP connection error:", error.message);
    } else {
      console.log("SMTP server is ready to send emails");
    }
  });
}

export default transporter;
