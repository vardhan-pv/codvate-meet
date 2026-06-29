import nodemailer from 'nodemailer'

const transporter = (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  if (!transporter) {
    console.warn(`\n======================================================`)
    console.warn(`[EMAIL LOG FALLBACK] No SMTP credentials in .env.local!`)
    console.warn(`TO: ${to}`)
    console.warn(`SUBJECT: ${subject}`)
    console.warn(`BODY: ${text}`)
    console.warn(`======================================================\n`)
    return false
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"CodovateMeet" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html
    })
    console.log(`[EMAIL SUCCESS] Email successfully dispatched to ${to}`)
    return true
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, err.message)
    return false
  }
}
