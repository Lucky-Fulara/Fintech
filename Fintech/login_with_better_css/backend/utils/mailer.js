const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: `Fintech <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your OTP Code - Complete Your Registration',
        text: `Your OTP code is: ${otp}.\nIt is valid for 5 minutes.\n\nThank you for using Fintech`
    };

    return transporter.sendMail(mailOptions);
};

module.exports = sendOTP;
