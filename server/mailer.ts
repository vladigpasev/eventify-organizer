"use server";

import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import path from "path";

// Ако нямате глобален fetch в Node 18+, инсталирайте node-fetch:
// import fetch from "node-fetch";

// Спираме Helvetica.afm:
PDFDocument.prototype.addStandardFonts = function () {
  // no-op
};

// Транспортер за имейли
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
 * Генерира "по-красив" PDF билет, като следи изображението
 * да не застъпва текста. (Ръчно задаваме doc.y след image)
 */
async function generateTicketPdf({
  guestFirstName,
  guestLastName,
  ticketCode,
  typeLabel,
}: {
  guestFirstName: string;
  guestLastName: string;
  ticketCode: string;
  typeLabel: string;
}): Promise<Buffer> {
  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      // 1) Сваляме thumbnail-а (примерен URL):
      const thumbnailUrl = "https://fasching.eventify.bg/event-thumbnail.jpg";
      const thumbResponse = await fetch(thumbnailUrl);
      if (!thumbResponse.ok) {
        throw new Error(`Не успях да сваля thumbnail: ${thumbnailUrl}`);
      }
      const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());

      // 2) Генерираме QR code -> dataURL
      const qrDataUrl = await QRCode.toDataURL(ticketCode, { width: 200 });

      // 3) Генерираме баркод PNG
      const barcodePng = await bwipjs.toBuffer({
        bcid: "code128",
        text: ticketCode,
        scale: 3,
        height: 15,
        includetext: true,
        textxalign: "center",
      });

      // 4) Създаваме PDFDocument
      const doc = new PDFDocument({
        autoFirstPage: false,
      });
      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // 5) Регистрираме OpenSans.ttf
      doc.registerFont(
        "OpenSans",
        path.join(process.cwd(), "public", "fonts", "opensans.ttf")
      );

      // 6) Нова страница с margin
      doc.addPage({
        size: "A4",
        margins: { top: 50, left: 50, right: 50, bottom: 60 },
      });
      doc.font("OpenSans");

      // (A) Поставяме thumbnail най-отгоре
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const imageX = doc.x;    // По подразбиране = left margin
      const imageY = doc.y;    // По подразбиране = top margin
      const thumbHeight = 180; // Ще ограничим височината до 180px

      doc.image(thumbBuffer, imageX, imageY, {
        fit: [pageWidth, thumbHeight],
        align: "center",
        valign: "top",
      });

      // Сега САМИ повдигаме doc.y, за да се пише текстът под картинката:
      doc.y = imageY + thumbHeight + 20; // 20px празно пространство под снимката


      // (C) Тип билет
      doc
        .fontSize(26)
        .fillColor("#da3c3c")
        .text(typeLabel.toUpperCase()+" 2025", { align: "center" })
        .moveDown(0.5);


      // (E) Данни за потребителя
      doc
        .fontSize(18)
        .fillColor("#2c2c2c")
        .text(`Име: ${guestFirstName} ${guestLastName}`)
        .moveDown(0.3)

      // (F) Разделяща линия
      const lineY = doc.y;
      doc
        .moveTo(doc.page.margins.left, lineY)
        .lineTo(doc.page.width - doc.page.margins.right, lineY)
        .strokeColor("#cccccc")
        .lineWidth(1)
        .stroke();

      doc.moveDown(1);

      // (G) QR и баркод един до друг
      const qrBase64 = qrDataUrl.split(",")[1];
      const qrBuffer = Buffer.from(qrBase64, "base64");

      const blockTop = doc.y;
      const blockX = doc.x;
      const columnWidth = pageWidth / 2 - 10;

      // QR в лявата колона
      doc.image(qrBuffer, blockX, blockTop, {
        fit: [columnWidth, 200],
        align: "left",
      });

      // Баркод в дясната колона (+20 px)
      const secondColX = blockX + columnWidth + 20;
      doc.image(barcodePng, secondColX, blockTop + 20, {
        fit: [columnWidth, 80],
        align: "right",
      });

      // Вдигаме doc.y под изображенията
      doc.y = blockTop + 220;
      doc.moveDown(1);

      // (H) Още инфо
      doc
        .fontSize(12)
        .fillColor("#555")
        .text(
          `Моля, запазете този билет. На входа ще сканираме 
QR кода или баркода. При нужда покажете билета и 
от своя телефон. Билетът включва достъп до основното събитие, 
много настроение и изненади. При въпроси: support@eventify.bg.`,
          {
            align: "justify",
          }
        )
        .moveDown(2);

      // (I) Footer
      doc
        .fontSize(10)
        .fillColor("#999")
        .text("Eventify BG © 2024 | All rights reserved", { align: "center" });

      // Затваряме
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Имейл с прикачен PDF билет.
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
  const pdfBuffer = await generateTicketPdf({
    guestFirstName,
    guestLastName,
    ticketCode,
    typeLabel,
  });

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
          <p>Вашият билет е потвърден и платен. Можете да го намерите в прикачения PDF.</p>
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
        filename: `Bilet-${ticketCode}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}
