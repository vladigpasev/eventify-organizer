'use server';
import { z } from 'zod';
//@ts-ignore
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eventCustomers, paperTickets, users, events } from '../../../schema/schema';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
//@ts-ignore
import nodemailer from 'nodemailer';
import { cookies } from 'next/headers';

const db = drizzle(sql);

export async function checkTicket(data: any) {
  // Define a schema for event data validation
  const ticketSchema = z.object({
    qrData: z.string().nonempty(),
    eventUuid: z.string().nonempty(),
  });
  const validatedData = ticketSchema.parse(data);
  try {
    const ticketToken = validatedData.qrData;
    const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
    let customerUuid;
    let nineDigitCode;
    if (decodedTicketToken.paper) {
      const paperUuid = decodedTicketToken.uuid;
      const currentPaperTicketDb = await db.select({
        assignedCustomer: paperTickets.assignedCustomer,
        nineDigitCode: paperTickets.nineDigitCode,
      })
        .from(paperTickets)
        .where(eq(paperTickets.uuid, paperUuid))
        .execute();
      const currentPaperTicket = currentPaperTicketDb[0];
      customerUuid = currentPaperTicket.assignedCustomer;
      nineDigitCode = currentPaperTicket.nineDigitCode;
    } else {
      customerUuid = decodedTicketToken.uuid;
      nineDigitCode = undefined;
    }

    const currentCustomerDb = await db.select({
      firstName: eventCustomers.firstname,
      lastName: eventCustomers.lastname,
      email: eventCustomers.email,
      guestCount: eventCustomers.guestCount,
      eventUuid: eventCustomers.eventUuid,
      isEntered: eventCustomers.isEntered,
      createdAt: eventCustomers.createdAt,
      sellerUuid: eventCustomers.sellerUuid,
      reservation: eventCustomers.reservation,
      tombola_weight: eventCustomers.tombola_weight,
      tombola_seller_uuid: eventCustomers.tombola_seller_uuid,
    })
      .from(eventCustomers)
      .where(eq(eventCustomers.uuid, customerUuid))
      .execute();
    const currentCustomer = currentCustomerDb[0];

    const eventDb = await db.select({
      tombolaPrice: events.tombolaPrice,
    })
      .from(events)
      .where(eq(events.uuid, validatedData.eventUuid))
      .execute();
    const event = eventDb[0];

    let sellerName;
    let sellerEmail;
    if (currentCustomer.sellerUuid) {
      const sellerDb = await db.select({
        firstName: users.firstname,
        lastName: users.lastname,
        email: users.email,
      })
        .from(users)
        .where(eq(users.uuid, currentCustomer.sellerUuid))
        .execute();
      const seller = sellerDb[0];
      sellerName = `${seller.firstName} ${seller.lastName}`;
      sellerEmail = seller.email;
    } else {
      sellerName = null;
      sellerEmail = null;
    }

    // Convert createdAt to dd.mm.YYYY, HH:mm:ss format in Sofia's time zone
    //@ts-ignore
    const createdAt = new Date(currentCustomer.createdAt);
    const sofiaTimeOptions = {
      timeZone: 'Europe/Sofia',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    //@ts-ignore
    const sofiaTimeFormatter = new Intl.DateTimeFormat('en-GB', sofiaTimeOptions);
    const parts = sofiaTimeFormatter.formatToParts(createdAt);
    const formattedCreatedAt = `${parts[0].value}.${parts[2].value}.${parts[4].value}, ${parts[6].value}:${parts[8].value}:${parts[10].value}`;

    const response = {
      ...currentCustomer,
      createdAt: formattedCreatedAt,
      nineDigitCode,
      sellerName: sellerName,
      sellerEmail: sellerEmail,
      tombolaPrice: event.tombolaPrice,
    }

    if (currentCustomer.eventUuid !== validatedData.eventUuid) {
      return ({ success: false });
    }
    return ({ success: true, response });
  } catch (err) {
    console.log(err)
    return ({ success: false });
  }
}

export async function markAsEntered(data: any) {
  // Define a schema for event data validation
  const ticketSchema = z.object({
    ticketToken: z.string().nonempty(),
    eventUuid: z.string().nonempty(),
  });
  const validatedData = ticketSchema.parse(data);
  try {
    const ticketToken = validatedData.ticketToken;
    const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
    let customerUuid;
    if (decodedTicketToken.paper) {
      const paperUuid = decodedTicketToken.uuid;
      const currentPaperTicketDb = await db.select({
        assignedCustomer: paperTickets.assignedCustomer,
      })
        .from(paperTickets)
        .where(eq(paperTickets.uuid, paperUuid))
        .execute();
      const currentPaperTicket = currentPaperTicketDb[0];
      customerUuid = currentPaperTicket.assignedCustomer;
    } else {
      customerUuid = decodedTicketToken.uuid;
    }
    await db.update(eventCustomers)
      .set({
        isEntered: true,
      })
      .where(eq(eventCustomers.uuid, customerUuid));

    return ({ success: true });
  } catch (err) {
    console.log(err)
    return ({ success: false });
  }
}

export async function markAsExited(data: any) {
  // Define a schema for event data validation
  const ticketSchema = z.object({
    ticketToken: z.string().nonempty(),
    eventUuid: z.string().nonempty(),
  });
  const validatedData = ticketSchema.parse(data);
  try {
    const ticketToken = validatedData.ticketToken;
    const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
    let customerUuid;
    if (decodedTicketToken.paper) {
      const paperUuid = decodedTicketToken.uuid;
      const currentPaperTicketDb = await db.select({
        assignedCustomer: paperTickets.assignedCustomer,
      })
        .from(paperTickets)
        .where(eq(paperTickets.uuid, paperUuid))
        .execute();
      const currentPaperTicket = currentPaperTicketDb[0];
      customerUuid = currentPaperTicket.assignedCustomer;
    } else {
      customerUuid = decodedTicketToken.uuid;
    }
    await db.update(eventCustomers)
      .set({
        isEntered: false,
      })
      .where(eq(eventCustomers.uuid, customerUuid));

    return ({ success: true });
  } catch (err) {
    console.log(err)
    return ({ success: false });
  }
}

export async function markAsPaid(data: any) {
  const token = cookies().get("token")?.value;
  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userUuid = decodedToken.uuid;
  // Define a schema for event data validation
  const ticketSchema = z.object({
    ticketToken: z.string().nonempty(),
    eventUuid: z.string().nonempty(),
  });
  const validatedData = ticketSchema.parse(data);
  try {
    const ticketToken = validatedData.ticketToken;
    const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
    let customerUuid;
    if (decodedTicketToken.paper) {
      const paperUuid = decodedTicketToken.uuid;
      const currentPaperTicketDb = await db.select({
        assignedCustomer: paperTickets.assignedCustomer,
      })
        .from(paperTickets)
        .where(eq(paperTickets.uuid, paperUuid))
        .execute();
      const currentPaperTicket = currentPaperTicketDb[0];
      customerUuid = currentPaperTicket.assignedCustomer;
    } else {
      customerUuid = decodedTicketToken.uuid;
    }
    await db.update(eventCustomers)
      .set({
        reservation: false,
        sellerUuid: userUuid,
      })
      .where(eq(eventCustomers.uuid, customerUuid));

    return ({ success: true });
  } catch (err) {
    console.log(err)
    return ({ success: false });
  }
}





export async function addToRaffle(data: any) {
  const token = cookies().get("token")?.value;
  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userUuid = decodedToken.uuid;

  // Define a schema for event data validation
  const raffleSchema = z.object({
    ticketToken: z.string().nonempty(),
    eventUuid: z.string().nonempty(),
    raffleTickets: z.number().int().positive().max(3),
  });
  const validatedData = raffleSchema.parse(data);

  try {
    const ticketToken = validatedData.ticketToken;
    const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
    let customerUuid;
    if (decodedTicketToken.paper) {
      const paperUuid = decodedTicketToken.uuid;
      const currentPaperTicketDb = await db.select({
        assignedCustomer: paperTickets.assignedCustomer,
      })
        .from(paperTickets)
        .where(eq(paperTickets.uuid, paperUuid))
        .execute();
      const currentPaperTicket = currentPaperTicketDb[0];
      customerUuid = currentPaperTicket.assignedCustomer;
    } else {
      customerUuid = decodedTicketToken.uuid;
    }

    const [currentUserDb, currentEventDb, currentCustomerDb] = await Promise.all([
      db.select({
        firstname: users.firstname,
        lastname: users.lastname,
        email: users.email,
      }).from(users).where(eq(users.uuid, userUuid)).execute(),
      db.select({
        eventName: events.eventName,
      }).from(events).where(eq(events.uuid, validatedData.eventUuid)).execute(),
      db.select({
        email: eventCustomers.email,
        firstname: eventCustomers.firstname,
        lastname: eventCustomers.lastname,
      }).from(eventCustomers).where(eq(eventCustomers.uuid, customerUuid)).execute()
    ]);

    const currentUser = currentUserDb[0];
    const currentEvent = currentEventDb[0];
    const currentCustomer = currentCustomerDb[0];

    await db.update(eventCustomers)
      .set({
        tombola_weight: validatedData.raffleTickets.toString(),
        tombola_seller_uuid: userUuid,
      })
      .where(eq(eventCustomers.uuid, customerUuid));

    let transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
      tls: {
        ciphers: 'SSLv3'
      }
    });

    const ticketWord = validatedData.raffleTickets === 1 ? 'билет' : 'билета';
    let info = await transporter.sendMail({
      from: `"${currentEvent.eventName} (via Eventify)" <${process.env.EMAIL_FROM}>`,
      to: currentCustomer.email,
      subject: `Вие успешно закупихте ${validatedData.raffleTickets} ${ticketWord} за томболата на събитието ${currentEvent.eventName}`,
      html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="bg"><head><meta charset="UTF-8"><meta content="width=device-width, initial-scale=1" name="viewport"><meta name="x-apple-disable-message-reformatting"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta content="telephone=no" name="format-detection"><title>New Template 3</title> <!--[if (mso 16)]><style type="text/css">     a {text-decoration: none;}     </style><![endif]--> <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--> <!--[if gte mso 9]><xml> <o:OfficeDocumentSettings> <o:AllowPNG></o:AllowPNG> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml>
        <![endif]--><style type="text/css">#outlook a { padding:0;}.es-button { mso-style-priority:100!important; text-decoration:none!important;}a[x-apple-data-detectors] { color:inherit!important; text-decoration:none!important; font-size:inherit!important; font-family:inherit!important; font-weight:inherit!important; line-height:inherit!important;}.es-desk-hidden { display:none; float:left; overflow:hidden; width:0; max-height:0; line-height:0; mso-hide:all;}@media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120%!important } h1 { font-size:36px!important; text-align:left } h2 { font-size:26px!important; text-align:left } h3 { font-size:20px!important; text-align:left } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:36px!important; text-align:left }
         .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:26px!important; text-align:left } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important; text-align:left } .es-menu td a { font-size:12px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:14px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:14px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:14px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important }
         .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:inline-block!important } a.es-button, button.es-button { font-size:20px!important; display:inline-block!important } .es-adaptive table, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:100%!important; height:auto!important } .es-m-p0 { padding:0!important } .es-m-p0r { padding-right:0!important } .es-m-p0l { padding-left:0!important } .es-m-p0t { padding-top:0!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important }
         tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-m-p5 { padding:5px!important } .es-m-p5t { padding-top:5px!important } .es-m-p5b { padding-bottom:5px!important } .es-m-p5r { padding-right:5px!important } .es-m-p5l { padding-left:5px!important } .es-m-p10 { padding:10px!important } .es-m-p10t { padding-top:10px!important } .es-m-p10b { padding-bottom:10px!important } .es-m-p10r { padding-right:10px!important }
         .es-m-p10l { padding-left:10px!important } .es-m-p15 { padding:15px!important } .es-m-p15t { padding-top:15px!important } .es-m-p15b { padding-bottom:15px!important } .es-m-p15r { padding-right:15px!important } .es-m-p15l { padding-left:15px!important } .es-m-p20 { padding:20px!important } .es-m-p20t { padding-top:20px!important } .es-m-p20r { padding-right:20px!important } .es-m-p20l { padding-left:20px!important } .es-m-p25 { padding:25px!important } .es-m-p25t { padding-top:25px!important } .es-m-p25b { padding-bottom:25px!important } .es-m-p25r { padding-right:25px!important } .es-m-p25l { padding-left:25px!important } .es-m-p30 { padding:30px!important } .es-m-p30t { padding-top:30px!important } .es-m-p30b { padding-bottom:30px!important } .es-m-p30r { padding-right:30px!important } .es-m-p30l { padding-left:30px!important } .es-m-p35 { padding:35px!important } .es-m-p35t { padding-top:35px!important }
         .es-m-p35b { padding-bottom:35px!important } .es-m-p35r { padding-right:35px!important } .es-m-p35l { padding-left:35px!important } .es-m-p40 { padding:40px!important } .es-m-p40t { padding-top:40px!important } .es-m-p40b { padding-bottom:40px!important } .es-m-p40r { padding-right:40px!important } .es-m-p40l { padding-left:40px!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } .h-auto { height:auto!important } }@media screen and (max-width:384px) {.mail-message-content { width:414px!important } }</style>
         </head> <body style="width:100%;font-family:arial, helvetica neue, helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0"><div dir="ltr" class="es-wrapper-color" lang="bg" style="background-color:#FAFAFA"> <!--[if gte mso 9]><v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t"> <v:fill type="tile" color="#fafafa"></v:fill> </v:background><![endif]--><table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#FAFAFA"><tr>
        <td valign="top" style="padding:0;Margin:0"><table cellpadding="0" cellspacing="0" class="es-content" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%"><tr><td class="es-info-area" align="center" style="padding:0;Margin:0"><table class="es-content-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" bgcolor="#FFFFFF" role="none"><tr><td align="left" style="padding:20px;Margin:0"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr>
        <td align="center" valign="top" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td> </tr></table></td></tr></table></td></tr></table></td></tr></table> <table cellpadding="0" cellspacing="0" class="es-header" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top"><tr>
        <td align="center" style="padding:0;Margin:0"><table bgcolor="#ffffff" class="es-header-body" align="center" cellpadding="0" cellspacing="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px"><tr><td align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:20px;padding-right:20px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td class="es-m-p0r" valign="top" align="center" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr>
        <td align="center" style="padding:0;Margin:0;padding-bottom:20px;font-size:0px"><img src="https://www.eventify.bg/logo.png" alt="Logo" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;font-size:12px" width="200" title="Logo"></td> </tr></table></td></tr></table></td></tr></table></td></tr></table> <table cellpadding="0" cellspacing="0" class="es-content" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%"><tr><td align="center" style="padding:0;Margin:0"><table bgcolor="#ffffff" class="es-content-body" align="center" cellpadding="0" cellspacing="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px"><tr>
        <td align="left" style="Margin:0;padding-bottom:10px;padding-top:20px;padding-left:20px;padding-right:20px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" valign="top" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px;font-size:0px"><img class="adapt-img" src="https://i.ibb.co/xshqnHm/2.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="300"></td> </tr><tr>
        <td align="center" class="es-m-txt-c" style="padding:0;Margin:0;padding-bottom:5px;padding-top:20px"><h1 style="Margin:0;line-height:55px;mso-line-height-rule:exactly;font-family:arial, helvetica neue, helvetica, sans-serif;font-size:46px;font-style:normal;font-weight:bold;color:#333333">Вие успешно закупихте ${validatedData.raffleTickets} ${ticketWord} за томболата на събитието ${currentEvent.eventName}</h1></td></tr></table></td></tr></table></td></tr> <tr><td align="left" style="padding:0;Margin:0;padding-top:20px;padding-left:20px;padding-right:20px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" valign="top" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr>
        <td align="left" style="padding:0;Margin:0"><div style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, helvetica neue, helvetica, sans-serif;line-height:30px;color:#333333;font-size:20px">Здравейте, ${currentCustomer.firstname} ${currentCustomer.lastname}!<br></div> <div style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, helvetica neue, helvetica, sans-serif;line-height:30px;color:#333333;font-size:20px">Този имейл е да ви уведоми, че сте закупили успешно ${validatedData.raffleTickets} ${ticketWord} за томболата на събитието ${currentEvent.eventName}. Ще обявим победителите малко по-късно през събитието. Успех!</div></td></tr></table></td></tr></table></td></tr></table></td></tr></table> <table cellpadding="0" cellspacing="0" class="es-content" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%"><tr>
        <td align="center" style="padding:0;Margin:0"><table bgcolor="#ffffff" class="es-content-body" align="center" cellpadding="0" cellspacing="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px"><tr><td class="esdev-adapt-off" align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:20px;padding-right:20px"><table cellpadding="0" cellspacing="0" class="esdev-mso-table" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:560px"><tr><td class="esdev-mso-td" valign="top" style="padding:0;Margin:0"><table cellpadding="0" cellspacing="0" class="es-left" align="left" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left"><tr>
        <td align="left" style="padding:0;Margin:0;width:30px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td> </tr></table></td></tr></table></td><td style="padding:0;Margin:0;width:20px"></td><td class="esdev-mso-td" valign="top" style="padding:0;Margin:0"><table cellpadding="0" cellspacing="0" class="es-left" align="left" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left"><tr><td align="left" style="padding:0;Margin:0;width:220px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td></tr></table></td></tr></table></td>
        <td style="padding:0;Margin:0;width:20px"></td> <td class="esdev-mso-td" valign="top" style="padding:0;Margin:0"><table cellpadding="0" cellspacing="0" class="es-left" align="left" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left"><tr><td align="left" style="padding:0;Margin:0;width:30px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td></tr></table></td></tr></table></td><td style="padding:0;Margin:0;width:20px"></td> <td class="esdev-mso-td" valign="top" style="padding:0;Margin:0"><table cellpadding="0" cellspacing="0" class="es-right" align="right" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right"><tr>
        <td align="left" style="padding:0;Margin:0;width:220px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td></tr></table></td></tr></table></td></tr></table></td></tr></table></td></tr></table> <table cellpadding="0" cellspacing="0" class="es-footer" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top"><tr>
        <td align="center" style="padding:0;Margin:0"><table class="es-footer-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" role="none"><tr><td align="left" style="Margin:0;padding-top:20px;padding-bottom:20px;padding-left:20px;padding-right:20px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="left" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr>
        <td align="center" style="padding:0;Margin:0;padding-bottom:35px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, helvetica neue, helvetica, sans-serif;line-height:18px;color:#333333;font-size:12px">Eventify.bg © 2024 Всички права запазени.</p> <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, helvetica neue, helvetica, sans-serif;line-height:18px;color:#333333;font-size:12px">ул. Позитано 26, София, България</p></td></tr></table></td></tr></table></td></tr></table></td></tr></table> <table cellpadding="0" cellspacing="0" class="es-content" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%"><tr>
        <td class="es-info-area" align="center" style="padding:0;Margin:0"><table class="es-content-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" bgcolor="#FFFFFF" role="none"><tr><td align="left" style="padding:20px;Margin:0"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" valign="top" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td> </tr></table></td></tr></table></td></tr></table></td></tr></table></td></tr></table></div></body></html>`, // Update this line to include HTML content if necessary
    });

    return ({ success: true });
  } catch (err) {
    console.log(err);
    return ({ success: false });
  }
}
