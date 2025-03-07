"use server";

import nodemailer from "nodemailer";
import bwipjs from "bwip-js";

// Настройка на nodemailer transporter (SMTP)
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
 * Генерира баркод (PNG) от ticketCode чрез bwip-js
 */
async function generateBarcodeImage(ticketCode: string): Promise<Buffer> {
  return await bwipjs.toBuffer({
    bcid: "code128",      // тип на баркода
    text: ticketCode,
    scale: 3,
    height: 15,
    includetext: true,
    textxalign: "center",
  });
}

/**
 * Изпраща имейл за „основен“ билет Fasching или Fasching + After 
 * при първоначално плащане.
 * + Позволява да подадем и линк за гласуване (voteUrl).
 */
export async function sendFaschingTicketEmail({
  guestEmail,
  guestFirstName,
  guestLastName,
  ticketCode,
  ticketType,
  ticketUrl,
  voteUrl, // <-- добавяме гласуване
}: {
  guestEmail: string;
  guestFirstName: string;
  guestLastName: string;
  ticketCode: string;
  ticketType: string;
  ticketUrl: string;
  voteUrl?: string; // може да е optional
}) {
  const typeLabel = ticketType === "fasching" ? "Фашинг" : "Фашинг + Афтър";

  // Генерираме баркод като PNG
  const barcodeBuffer = await generateBarcodeImage(ticketCode);

  // Подготвяме HTML
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
        .highlight {
          font-weight: bold;
          color: #e74c3c; /* червеникав нюанс */
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
          <p>Вашият билет за ${typeLabel} 2025 е потвърден и платен. Можете да го отворите, като натиснете бутона по-долу.</p>
          <p><strong>Код на билета:</strong> <span class="highlight">${ticketCode}</span></p>
          <p>
            <a class="btn" href="${ticketUrl}" target="_blank">
              Преглед на билета
            </a>
          </p>
          <p>Очакваме ви с нетърпение!</p>
        </div>
        <div class="footer">
          <p>© 2025 Eventify BG</p>
        </div>
      </div>
    </body>
  </html>
  `;

  // Изпращаме имейла
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

/**
 * Изпраща имейл при "upgrade" от fasching към fasching_after (доплащане).
 * Може също да добавим voteUrl тук, ако искаме (примерно, ако гостът все още не е гласувал).
 */
export async function sendFaschingAfterUpgradeEmail({
  guestEmail,
  guestFirstName,
  guestLastName,
  ticketCode,
  ticketUrl,
}: {
  guestEmail: string;
  guestFirstName: string;
  guestLastName: string;
  ticketCode?: string;
  ticketUrl: string;
}) {
  let attachments = [];
  if (ticketCode) {
    const barcodeBuffer = await generateBarcodeImage(ticketCode);
    attachments.push({
      filename: `Barcode-${ticketCode}.png`,
      content: barcodeBuffer,
      contentType: "image/png",
    });
  }

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
          <h1>Билетът ти е ъпгрейднат до Fasching + After!</h1>
        </div>
        <div class="content">
          <p>Здравей, <strong>${guestFirstName} ${guestLastName}</strong>!</p>
          <p>Поздравления! Твоят билет за Фашинг беше ъпгрейднат до <strong>Fasching + After</strong>.</p>
          <p><strong>Код на билета:</strong> ${ticketCode || ""}</p>
          <p><a class="btn" href="${ticketUrl}" target="_blank">Преглед на билета</a></p>
          <p>Очакваме ви с нетърпение!</p>
        </div>
        <div class="footer">
          <p>© 2025 Eventify BG</p>
        </div>
      </div>
    </body>
  </html>
  `;

  await transporter.sendMail({
    from: "no-reply@eventify.bg",
    to: guestEmail,
    subject: "Билетът ти е ъпгрейднат до Fasching + After!",
    html: htmlContent,
    attachments,
  });
}
