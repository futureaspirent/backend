import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

export const sendOtpEmail = async (email, otp) => {
  const sentFrom = new Sender(
    "no-reply@test-q3enl6k0ypm42vwr.mlsender.net", // verified sender
    "Inventory App"
  );

  const recipients = [new Recipient(email)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject("OTP Request")
    .setHtml(`
      <h2>${otp}</h2>
      <p>Change your password</p>
      <p>OTP will expire in 30 minutes</p>
    `);

  await mailerSend.email.send(emailParams);
};
