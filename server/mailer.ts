"use server";

import nodemailer from "nodemailer";
import bwipjs from "bwip-js";

// Set up the email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  tls: {
    ciphers: "SSLv3",
  },
});

/**
 * Generates a barcode image (PNG) from the ticket code using bwip-js.
 */
async function generateBarcodeImage(ticketCode: string): Promise<Buffer> {
  return await bwipjs.toBuffer({
    bcid: "code128",
    text: ticketCode,
    scale: 3,
    height: 15,
    includetext: true,
    textxalign: "center",
  });
}

/**
 * Sends an email with the barcode image attached.
 */
export async function sendFaschingTicketEmail({
  guestEmail,
  guestFirstName,
  guestLastName,
  ticketCode,
  ticketType,
  ticketUrl,
}: {
  guestEmail: string;
  guestFirstName: string;
  guestLastName: string;
  ticketCode: string;
  ticketType: string;
  ticketUrl: string;
}) {
  const typeLabel = ticketType === "fasching" ? "Фашинг" : "Фашинг + Афтър";

  // Generate the barcode image buffer
  const barcodeBuffer = await generateBarcodeImage(ticketCode);

  const htmlContent = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #3498db 0%, #8e44ad 100%);
          color: #fff;
          text-align: center;
          padding: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }
        .btn {
          display: inline-block;
          margin-top: 20px;
          background: #3498db;
          color: #fff !important;
          padding: 10px 15px;
          text-decoration: none;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          padding: 10px;
          background: #f4f4f4;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Билет за ${typeLabel}</h1>
        </div>
        <div class="content">
          <p>Здравейте, <strong>${guestFirstName} ${guestLastName}</strong>!</p>
          <p>Вашият билет е потвърден и платен. Моля, вижте прикачения баркод като билет.</p>
          <p><strong>Код на билета:</strong> ${ticketCode}</p>
          <p>Също така можете да последвате този линк, за да видите билета онлайн:</p>
          <p><a class="btn" href="${ticketUrl}" target="_blank">Преглед на билета</a></p>
          <p>Очакваме ви с нетърпение!</p>
        </div>
        <div class="footer">
          <p>© 2024 Eventify BG</p>
        </div>
      </div>
    </body>
  </html>
  `;

  const mailOptions = {
    from: "no-reply@eventify.bg",
    to: guestEmail,
    subject: `Билет за ${typeLabel} (платен)`,
    html: htmlContent,
    attachments: [
      {
        filename: `Barcode-${ticketCode}.png`,
        content: barcodeBuffer,
        contentType: "image/png",
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}
