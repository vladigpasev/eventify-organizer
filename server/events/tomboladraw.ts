// server/actions/tombola.ts
"use server"
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eventCustomers, tombolaItems, users, events } from '../../schema/schema';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { cookies } from 'next/headers';
//@ts-ignore
import jwt from 'jsonwebtoken';
//@ts-ignore
import nodemailer from 'nodemailer';

const db = drizzle(sql);

export async function drawWinners({ eventUuid }: { eventUuid: string }) {
    try {
        const tombolaItemsDb = await db.select({
            uuid: tombolaItems.uuid,
            itemName: tombolaItems.itemName,
            winnerUuid: tombolaItems.winnerUuid,
        }).from(tombolaItems).where(eq(tombolaItems.eventUuid, eventUuid)).execute();

        const eligibleCustomersDb = await db.select({
            uuid: eventCustomers.uuid,
            firstname: eventCustomers.firstname,
            lastname: eventCustomers.lastname,
            tombola_weight: eventCustomers.tombola_weight,
        }).from(eventCustomers)
            .where(and(
                eq(eventCustomers.eventUuid, eventUuid),
                //@ts-ignore
                gt(eventCustomers.tombola_weight, 0)
            ))
            .execute();

        const weightedCustomerList = eligibleCustomersDb.reduce((list, customer) => {
            //@ts-ignore
            const weight = parseInt(customer.tombola_weight);
            for (let i = 0; i < weight; i++) {
                //@ts-ignore
                list.push(customer);
            }
            return list;
        }, []);

        const winners = tombolaItemsDb.map(item => {
            const winner = weightedCustomerList[Math.floor(Math.random() * weightedCustomerList.length)];
            return {
                ...item,
                //@ts-ignore
                winnerUuid: winner.uuid,
                //@ts-ignore
                winnerName: `${winner.firstname} ${winner.lastname}`,
            };
        });

        return { success: true, winners };
    } catch (error) {
        console.error('Error drawing winners:', error);
        //@ts-ignore
        return { success: false, message: error.message };
    }
}

export async function approveWinners({ eventUuid, winners }: { eventUuid: string, winners: { uuid: string, winnerUuid: string, itemName: string }[] }) {
    try {
        const winnerUuids = winners.map(w => w.winnerUuid);

        const winnersDetailsDb = await db.select({
            uuid: eventCustomers.uuid,
            firstname: eventCustomers.firstname,
            lastname: eventCustomers.lastname,
            email: eventCustomers.email,
        }).from(eventCustomers).where(inArray(eventCustomers.uuid, winnerUuids)).execute();

        const eventDb = await db.select({
            eventName: events.eventName,
        }).from(events).where(eq(events.uuid, eventUuid)).execute();

        const event = eventDb[0];

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
            }
        });

        for (const { uuid, winnerUuid, itemName } of winners) {
            await db.update(tombolaItems).set({ winnerUuid }).where(eq(tombolaItems.uuid, uuid)).execute();

            const winnerDetails = winnersDetailsDb.find(w => w.uuid === winnerUuid);

            if (winnerDetails) {
                await transporter.sendMail({
                    from: `"Eventify" <${process.env.EMAIL_FROM}>`,
                    to: winnerDetails.email,
                    subject: `Поздравления! Вие спечелихте награда от томболата на събитието ${event.eventName}`,
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
        <td align="center" class="es-m-txt-c" style="padding:0;Margin:0;padding-bottom:5px;padding-top:20px"><h1 style="Margin:0;line-height:55px;mso-line-height-rule:exactly;font-family:arial, helvetica neue, helvetica, sans-serif;font-size:46px;font-style:normal;font-weight:bold;color:#333333">Поздравления! Вие спечелихте награда от томболата на събитието ${event.eventName}.</h1></td></tr></table></td></tr></table></td></tr> <tr><td align="left" style="padding:0;Margin:0;padding-top:20px;padding-left:20px;padding-right:20px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" valign="top" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr>
        <td align="left" style="padding:0;Margin:0"><div style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, helvetica neue, helvetica, sans-serif;line-height:30px;color:#333333;font-size:20px">Здравейте, ${winnerDetails.firstname} ${winnerDetails.lastname}!<br></div> <div style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, helvetica neue, helvetica, sans-serif;line-height:30px;color:#333333;font-size:20px">Честито! Вие спечелихте награда "${itemName}" от томболата на събитието ${event.eventName}. Моля, свържете се с организаторите за повече информация относно наградата си.</div></td></tr></table></td></tr></table></td></tr></table></td></tr></table> <table cellpadding="0" cellspacing="0" class="es-content" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%"><tr>
        <td align="center" style="padding:0;Margin:0"><table bgcolor="#ffffff" class="es-content-body" align="center" cellpadding="0" cellspacing="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px"><tr><td class="esdev-adapt-off" align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:20px;padding-right:20px"><table cellpadding="0" cellspacing="0" class="esdev-mso-table" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:560px"><tr><td class="esdev-mso-td" valign="top" style="padding:0;Margin:0"><table cellpadding="0" cellspacing="0" class="es-left" align="left" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left"><tr>
        <td align="left" style="padding:0;Margin:0;width:30px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td> </tr></table></td></tr></table></td><td style="padding:0;Margin:0;width:20px"></td><td class="esdev-mso-td" valign="top" style="padding:0;Margin:0"><table cellpadding="0" cellspacing="0" class="es-left" align="left" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left"><tr><td align="left" style="padding:0;Margin:0;width:220px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td></tr></table></td></tr></table></td>
        <td style="padding:0;Margin:0;width:20px"></td> <td class="esdev-mso-td" valign="top" style="padding:0;Margin:0"><table cellpadding="0" cellspacing="0" class="es-left" align="left" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left"><tr><td align="left" style="padding:0;Margin:0;width:30px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td></tr></table></td></tr></table></td><td style="padding:0;Margin:0;width:20px"></td> <td class="esdev-mso-td" valign="top" style="padding:0;Margin:0"><table cellpadding="0" cellspacing="0" class="es-right" align="right" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right"><tr>
        <td align="left" style="padding:0;Margin:0;width:220px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td></tr></table></td></tr></table></td></tr></table></td></tr></table></td></tr></table> <table cellpadding="0" cellspacing="0" class="es-footer" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top"><tr>
        <td align="center" style="padding:0;Margin:0"><table class="es-footer-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" role="none"><tr><td align="left" style="Margin:0;padding-top:20px;padding-bottom:20px;padding-left:20px;padding-right:20px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="left" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr>
        <td align="center" style="padding:0;Margin:0;padding-bottom:35px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, helvetica neue, helvetica, sans-serif;line-height:18px;color:#333333;font-size:12px">Eventify.bg © 2024 Всички права запазени.</p> <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, helvetica neue, helvetica, sans-serif;line-height:18px;color:#333333;font-size:12px">ул. Позитано 26, София, България</p></td></tr></table></td></tr></table></td></tr></table></td></tr></table> <table cellpadding="0" cellspacing="0" class="es-content" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%"><tr>
        <td class="es-info-area" align="center" style="padding:0;Margin:0"><table class="es-content-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" bgcolor="#FFFFFF" role="none"><tr><td align="left" style="padding:20px;Margin:0"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" valign="top" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td> </tr></table></td></tr></table></td></tr></table></td></tr></table></td></tr></table></div></body></html>`, // Update this line to include HTML content if necessary
                });
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Error approving winners:', error);
        //@ts-ignore
        return { success: false, message: error.message };
    }
}
