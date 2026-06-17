const nodemailer = require('nodemailer');
// noreply@microbiotech-online.com
// 7~;!=t$V}dK?
const sendMail = async (to, subject, html) => {
    return new Promise(async (resolve, reject) => {
        const transporter = await nodemailer.createTransport({
            host: 'betatestinglink.com',
            port: 465,
            secure: true, // Use true if you're using port 465 (SSL)
            auth: {
                user: 'noreply@betatestinglink.com',
                pass: 'zU7VMdddbkPD9X7yL4Dt'
            },
            tls: {
                // Do not fail on invalid certs
                rejectUnauthorized: false
            }
        });

        // Construct the email message
        const mailOptions = {
            from: 'noreply@betatestinglink.com',
            to: to,
            subject: subject,
            html: html
        };
        var success = false
        // Send the email
        await transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject(error);
            } else {
                console.log(`Email successfully sent to ${to}`)
                resolve(info);
            }
        });
        return success
    })
}

module.exports = sendMail