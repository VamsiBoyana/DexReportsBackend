const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully to:", options.email);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Email could not be sent");
  }
};

module.exports = { sendEmail };
