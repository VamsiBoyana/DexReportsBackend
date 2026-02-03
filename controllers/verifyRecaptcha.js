// controllers/verifyRecaptcha.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;

export const verifyRecaptcha = async (recaptchaToken) => {
  try {
    if (!recaptchaToken) throw new Error("No reCAPTCHA token provided");

    const verifyURL = "https://www.google.com/recaptcha/api/siteverify";
    const params = new URLSearchParams();
    params.append("secret", RECAPTCHA_SECRET);
    params.append("response", recaptchaToken);

    const response = await axios.post(verifyURL, params);
    const data = response.data;

    return data.success;
  } catch (error) {
    console.error("Error during reCAPTCHA verification", error);
    throw new Error("Error during reCAPTCHA verification");
  }
};
