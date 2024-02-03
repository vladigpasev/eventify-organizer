'use server';
import { z } from 'zod';
//@ts-ignore
import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { users } from '../schema/schema';
import { InferInsertModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'
//@ts-ignore
import nodemailer from 'nodemailer';
import { redirect } from 'next/navigation';

const db = drizzle(sql);

export async function registerUser(data: any) {
    const userSchema = z.object({
        firstname: z.string(),
        lastname: z.string(),
        company: z.string(),
        email: z.string().email(),
        password: z.string().min(10).max(100),
        confirmPassword: z.string(),
    }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });
    console.log('Received data:', data);
    if (!data || typeof data !== 'object') {
        console.error('Invalid input data:', data);
        return { success: false, message: 'Invalid input data' };
    }
    // Validate the data against the schema
    const validationResult = userSchema.safeParse(data);
    if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error);
        return { success: false, message: 'Validation failed' };
    }

    // Proceed if data is valid
    try {
        console.log('Registering user:', data);

        // Hash the password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user: InferInsertModel<typeof users> = {
            firstname: data.firstname,
            lastname: data.lastname,
            company: data.company,
            email: data.email,
            password: hashedPassword
        };

        // Insert user data into the database using Drizzle's correct insert method
        const result = await db.insert(users).values(user).execute();

        console.log('User registered successfully', result);
        return { success: true, message: 'User registered successfully' };
    } catch (error) {
        console.error('Registration failed:', error);

        // Parse the error message to a JSON object.
        let errorMessage = JSON.stringify(error);
        let errorObj = JSON.parse(errorMessage);

        // Check if the error is specifically about the email already existing.
        if (errorObj.code === "23505" && errorObj.detail.includes("already exists")) {
            return { success: false, message: "The email already exists. Please use a different email." };
        } else {
            // For all other errors, return a generic registration failed message.
            return { success: false, message: "Registration failed. Please try again or contact Eventify support." };
        }
    }

}

export async function loginUser(data: any) {
    const loginSchema = z.object({
        email: z.string().email(),
        password: z.string(),
    });
    console.log('Received login data:', data);
    if (!data || typeof data !== 'object') {
        console.error('Invalid login data:', data);
        return { success: false, message: 'Invalid login data' };
    }
    // Validate the data against the schema
    const validationResult = loginSchema.safeParse(data);
    if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error);
        return { success: false, message: 'Please fill all fields correctly!' };
    }

    // Proceed if data is valid
    try {
        console.log('Authenticating user:', data);

        // Retrieve user from the database
        const userQueryResult = await db.select({
            uuid: users.uuid,
            email: users.email,
            password: users.password,
            email_verified: users.email_verified
        })
            .from(users)
            .where(eq(users.email, data.email))
            .execute();


        // Check if user exists
        if (userQueryResult.length > 0) {
            // There are results
        } else {
            return { success: false, message: 'User not found' };
        }


        const user = userQueryResult[0];

        // Compare the hashed passwords
        const isPasswordValid = await bcrypt.compare(data.password, user.password);
        if (!isPasswordValid) {
            return { success: false, message: 'Invalid password' };
        }

        console.log('User authenticated successfully');
        const token = jwt.sign({ uuid: user.uuid, email_verified: user.email_verified, email_addr: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        cookies().set({
            name: 'token',
            value: token,
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 3600,
            sameSite: 'lax',
        })

        return { success: true, message: 'User authenticated successfully' };

    } catch (error) {
        console.error('Authentication failed:', error);
        return { success: false, message: 'Authentication failed. Please try again or contact Eventify support.' };
    }
}

function generateVerificationToken(email: any) {
    const token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return token;
}

export async function sendEmail(email: any) {
    const token = cookies().get("token")?.value;
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    if(!decoded){
        return;
    }
    if(decoded.email_verified){
        return;
    }
    const userQueryResult = await db.select({
        sentVerification: users.sentVerification,
        lastEmailSentAt: users.lastEmailSentAt // assuming you have a lastEmailSentAt field
    })
        .from(users)
        .where(eq(users.email, email))
        .execute();

    // const isVerificationSent = userQueryResult.length > 0 && userQueryResult[0].sentVerification;
    const lastEmailSentAt = userQueryResult[0]?.lastEmailSentAt || new Date(0); // default to epoch if null
    const currentTime = new Date();

    // Check if it's been at least 1 minute since the last email
    //@ts-ignore
    if (currentTime - new Date(lastEmailSentAt) < 60000) {
        console.log("Email sent less than a minute ago. Try again later.");
        return;
    }

    // if (isVerificationSent) {
    //     return;
    // }

    const verificationToken = generateVerificationToken(email);

    try {
        let transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SERVER_HOST,
            port: process.env.EMAIL_SERVER_PORT,
            secure: false,
            auth: {
                user: process.env.EMAIL_SERVER_USER, // your Office365 email
                pass: process.env.EMAIL_SERVER_PASSWORD, // your Office365 password
            },
            tls: {
                ciphers: 'SSLv3'
            }
        });

        let info = await transporter.sendMail({
            from: '"Eventify" ' + process.env.EMAIL_FROM, // sender address
            to: email, // list of receivers
            subject: "Email Verification", // Subject line
            text: 'Please verify your email address. Link: ' + process.env.BASE_URL + '/auth/verification-link/' + verificationToken, // plain text body
            html: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en"><head><meta charset="UTF-8"><meta content="width=device-width, initial-scale=1" name="viewport"><meta name="x-apple-disable-message-reformatting"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta content="telephone=no" name="format-detection"><title>New Template</title> <!--[if (mso 16)]><style type="text/css">     a {text-decoration: none;}     </style><![endif]--> <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--> <!--[if gte mso 9]><xml> <o:OfficeDocumentSettings> <o:AllowPNG></o:AllowPNG> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml>\
            <![endif]--><style type="text/css">#outlook a { padding:0;}.es-button { mso-style-priority:100!important; text-decoration:none!important;}a[x-apple-data-detectors] { color:inherit!important; text-decoration:none!important; font-size:inherit!important; font-family:inherit!important; font-weight:inherit!important; line-height:inherit!important;}.es-desk-hidden { display:none; float:left; overflow:hidden; width:0; max-height:0; line-height:0; mso-hide:all;}@media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120%!important } h1 { font-size:36px!important; text-align:left } h2 { font-size:26px!important; text-align:left } h3 { font-size:20px!important; text-align:left } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:36px!important; text-align:left }\
             .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:26px!important; text-align:left } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important; text-align:left } .es-menu td a { font-size:12px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:14px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:14px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:14px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important }\
             .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:inline-block!important } a.es-button, button.es-button { font-size:20px!important; display:inline-block!important } .es-adaptive table, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:100%!important; height:auto!important } .es-m-p0 { padding:0!important } .es-m-p0r { padding-right:0!important } .es-m-p0l { padding-left:0!important } .es-m-p0t { padding-top:0!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important }\
             tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-m-p5 { padding:5px!important } .es-m-p5t { padding-top:5px!important } .es-m-p5b { padding-bottom:5px!important } .es-m-p5r { padding-right:5px!important } .es-m-p5l { padding-left:5px!important } .es-m-p10 { padding:10px!important } .es-m-p10t { padding-top:10px!important } .es-m-p10b { padding-bottom:10px!important } .es-m-p10r { padding-right:10px!important }\
             .es-m-p10l { padding-left:10px!important } .es-m-p15 { padding:15px!important } .es-m-p15t { padding-top:15px!important } .es-m-p15b { padding-bottom:15px!important } .es-m-p15r { padding-right:15px!important } .es-m-p15l { padding-left:15px!important } .es-m-p20 { padding:20px!important } .es-m-p20t { padding-top:20px!important } .es-m-p20r { padding-right:20px!important } .es-m-p20l { padding-left:20px!important } .es-m-p25 { padding:25px!important } .es-m-p25t { padding-top:25px!important } .es-m-p25b { padding-bottom:25px!important } .es-m-p25r { padding-right:25px!important } .es-m-p25l { padding-left:25px!important } .es-m-p30 { padding:30px!important } .es-m-p30t { padding-top:30px!important } .es-m-p30b { padding-bottom:30px!important } .es-m-p30r { padding-right:30px!important } .es-m-p30l { padding-left:30px!important } .es-m-p35 { padding:35px!important } .es-m-p35t { padding-top:35px!important }\
             .es-m-p35b { padding-bottom:35px!important } .es-m-p35r { padding-right:35px!important } .es-m-p35l { padding-left:35px!important } .es-m-p40 { padding:40px!important } .es-m-p40t { padding-top:40px!important } .es-m-p40b { padding-bottom:40px!important } .es-m-p40r { padding-right:40px!important } .es-m-p40l { padding-left:40px!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } }@media screen and (max-width:384px) {.mail-message-content { width:414px!important } }</style>\
             </head> <body style="width:100%;font-family:arial, \'helvetica neue\', helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0"><div dir="ltr" class="es-wrapper-color" lang="en" style="background-color:#FAFAFA"> <!--[if gte mso 9]><v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t"> <v:fill type="tile" color="#fafafa"></v:fill> </v:background><![endif]--><table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#FAFAFA"><tr>\
            <td valign="top" style="padding:0;Margin:0"><table cellpadding="0" cellspacing="0" class="es-content" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%"><tr><td class="es-info-area" align="center" style="padding:0;Margin:0"><table class="es-content-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" bgcolor="#FFFFFF"><tr><td align="left" style="padding:20px;Margin:0"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr>\
            <td align="center" valign="top" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;display:none"></td> </tr></table></td></tr></table></td></tr></table></td></tr></table> <table cellpadding="0" cellspacing="0" class="es-header" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top"><tr><td align="center" style="padding:0;Margin:0"><table bgcolor="#ffffff" class="es-header-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px"><tr>\
            <td align="left" style="padding:20px;Margin:0"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td class="es-m-p0r" valign="top" align="center" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;padding-bottom:10px;font-size:0px"><img src="https://ecgujso.stripocdn.email/content/guids/CABINET_a6c6f8e67fe63cb55c5b81b9a27eda75d15ec072f298cb1e089320d24d41e58e/images/logo_eventify_1.png" alt="Logo" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;font-size:12px" width="200" title="Logo"></td> </tr></table></td></tr></table></td></tr></table></td></tr></table>\
             <table cellpadding="0" cellspacing="0" class="es-content" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%"><tr><td align="center" style="padding:0;Margin:0"><table bgcolor="#ffffff" class="es-content-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px"><tr><td align="left" style="padding:0;Margin:0;padding-top:15px;padding-left:20px;padding-right:20px"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr>\
            <td align="center" valign="top" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px;font-size:0px"><img src="https://ecgujso.stripocdn.email/content/guids/CABINET_91d375bbb7ce4a7f7b848a611a0368a7/images/69901618385469411.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="100"></td> </tr><tr><td align="center" class="es-m-p0r es-m-p0l es-m-txt-c" style="Margin:0;padding-top:15px;padding-bottom:15px;padding-left:40px;padding-right:40px"><h1 style="Margin:0;line-height:55px;mso-line-height-rule:exactly;font-family:arial, "helvetica neue, helvetica, sans-serif;font-size:46px;font-style:normal;font-weight:bold;color:#333333">Profile confirmation&nbsp;</h1></td>\
            </tr><tr><td align="left" style="padding:0;Margin:0;padding-top:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, \'helvetica neue\', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">After you click the button, your profile at Eventify will be verified with your email address.</p> <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, \'helvetica neue\', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px"><br></p></td></tr></table></td></tr></table></td></tr> <tr><td align="left" style="padding:0;Margin:0;padding-bottom:20px;padding-left:20px;padding-right:20px"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr>\
            <td align="center" valign="top" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:separate;border-spacing:0px;border-radius:5px"><tr>\
            <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><span class="es-button-border" style="border-style:solid;border-color:#2CB543;background:#3042bf;border-width:0px;display:inline-block;border-radius:6px;width:auto"><a href="'+ process.env.BASE_URL + '/auth/verification-link/' + verificationToken + '" class="es-button" target="_blank" style="mso-style-priority:100 !important;text-decoration:none;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;color:#FFFFFF;font-size:20px;padding:10px 30px 10px 30px;display:inline-block;background:#3042bf;border-radius:6px;font-family:arial, \'helvetica neue\', helvetica, sans-serif;font-weight:normal;font-style:normal;line-height:24px;width:auto;text-align:center;mso-padding-alt:0;mso-border-alt:10px solid #3042bf;padding-left:30px;padding-right:30px">CONFIRM PROFILE</a> </span></td></tr><tr>\
            <td align="center" class="es-m-txt-c" style="padding:0;Margin:0;padding-top:10px"><h3 style="Margin:0;line-height:30px;mso-line-height-rule:exactly;font-family:arial, \'helvetica neue\', helvetica, sans-serif;font-size:20px;font-style:normal;font-weight:bold;color:#333333">This link is valid for one use only. Expires in 1 day.</h3></td></tr><tr><td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, \'helvetica neue\', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">If you did not request to make an account, please disregard this message or contact our customer service department.</p></td></tr></table></td></tr></table></td></tr></table></td></tr></table>\
             <table cellpadding="0" cellspacing="0" class="es-footer" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top"><tr><td align="center" style="padding:0;Margin:0"><table class="es-footer-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px"><tr><td align="left" style="Margin:0;padding-top:20px;padding-bottom:20px;padding-left:20px;padding-right:20px"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr>\
            <td align="left" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" style="padding:0;Margin:0;padding-bottom:35px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, \'helvetica neue\', helvetica, sans-serif;line-height:18px;color:#333333;font-size:12px">Eventify.bg © 2024 All Rights Reserved.</p> <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, \'helvetica neue\', helvetica, sans-serif;line-height:18px;color:#333333;font-size:12px">26 Positano Str, Sofia, Bulgaria</p></td></tr></table></td></tr></table></td></tr></table></td></tr></table>\
             <table cellpadding="0" cellspacing="0" class="es-content" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%"><tr><td class="es-info-area" align="center" style="padding:0;Margin:0"><table class="es-content-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" bgcolor="#FFFFFF"><tr><td align="left" style="padding:20px;Margin:0"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr><td align="center" valign="top" style="padding:0;Margin:0;width:560px"><table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px"><tr>\
            <td align="center" style="padding:0;Margin:0;display:none"></td> </tr></table></td></tr></table></td></tr></table></td></tr></table></td></tr></table></div></body></html>',
        });

        console.log("Message sent: %s", info.messageId);
        await db.update(users)
            .set({
                sentVerification: true,
                verification_token: verificationToken,
                lastEmailSentAt: currentTime // update the last email sent time
            })
            .where(eq(users.email, email));

        return { success: true };
    } catch (error) {
        // Handle the error
        return { success: false };

    }
}

export async function handleLogout() {
    cookies().delete('token');
    redirect("/auth/login");
}

export async function checkAuthenticated() {
    const auth_token = cookies().get("token")?.value;
    //console.log(auth_token);
    try {
        const decoded = await jwt.verify(auth_token, process.env.JWT_SECRET);
        return true;
    } catch (error) {
        return false;
    }
}

export async function verifyToken(token:any) {
    const auth_token = cookies().get("token")?.value;
    try {
        const decoded = await jwt.verify(auth_token, process.env.JWT_SECRET);
        return decoded;
    } catch (error) {
        return false;
    }
}