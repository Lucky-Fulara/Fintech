const nodemailer = require('nodemailer');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');  // Optional if you want JWT login response
const User = require("../models/User");

// ✅ Temporary store for OTPs (for registration only in this version)
let otps = {};

// ✅ Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ✅ Central Error Handler
const handleError = (res, error, message = "❌ Server error.") => {
    console.error(message, error);
    res.status(500).json({ message });
};

// ✅ Generate a 5-digit OTP
const generateOTP = () => Math.floor(10000 + Math.random() * 90000).toString();

// ✅ Start Registration - Send OTP to email
const startRegistration = async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "❌ User already exists!" });
        }

        const otp = generateOTP();
        const hashedPassword = await bcrypt.hash(password, 10);  // Hash before storing

        otps[email] = {
            otp,
            hashedPassword,
            expiresAt: Date.now() + 5 * 60 * 1000  // 5 minutes expiry
        };

        const mailOptions = {
            from: `Fintech <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your OTP Code - Complete Your Registration',
            text: `Hello,\n\nYour OTP code is: ${otp}.\nIt is valid for 5 minutes.\n\n`
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP sent to ${email}: ${otp}`);

        res.status(200).json({ message: "✅ OTP sent to your email. Please verify to complete registration." });

    } catch (error) {
        handleError(res, error, "❌ Error starting registration");
    }
};

// ✅ Complete Registration - Verify OTP & Save User
const verifyRegistrationOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const storedOtpData = otps[email];
        if (!storedOtpData) {
            return res.status(400).json({ message: "❌ No OTP found for this email." });
        }

        if (storedOtpData.otp !== otp || Date.now() > storedOtpData.expiresAt) {
            return res.status(400).json({ message: "❌ Invalid or expired OTP." });
        }

        const newUser = new User({
            email,
            password: storedOtpData.hashedPassword,
            isVerified: true // ✅ Set after successful OTP verification
        });

        await newUser.save();
        delete otps[email];

        res.status(201).json({ message: "✅ Registration complete!" });

    } catch (error) {
        handleError(res, error, "❌ Error verifying registration OTP");
    }
};

// ✅ Resend OTP During Registration
const resendRegistrationOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!otps[email]) {
            return res.status(400).json({ message: "❌ No registration process found for this email." });
        }

        const newOtp = generateOTP();
        otps[email].otp = newOtp;
        otps[email].expiresAt = Date.now() + 5 * 60 * 1000;  // Reset expiry to 5 minutes

        const mailOptions = {
            from: `Fintech <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your OTP Code - Resend (Complete Your Registration)',
            text: `Hello,\n\nYour new OTP code is: ${newOtp}.\nIt is valid for 5 minutes.`
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Resent OTP to ${email}: ${newOtp}`);

        res.status(200).json({ message: "✅ New OTP sent to your email." });

    } catch (error) {
        handleError(res, error, "❌ Error resending OTP");
    }
};

// ✅ Login User (Now checks `isVerified`)
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "❌ User not found!" });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: "❌ Please verify your email before logging in." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "❌ Incorrect password!" });
        }

        // Optional: Generate JWT Token
        // const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: "✅ Login successful!",
            // token  // Uncomment if you're using JWT
        });

    } catch (error) {
        handleError(res, error, "❌ Error logging in");
    }
};

// ✅ Export All Controllers
module.exports = {
    startRegistration,      // Step 1 - Start registration & send OTP
    verifyRegistrationOTP,  // Step 2 - Complete registration after OTP verification
    resendRegistrationOTP,  // Resend OTP if needed
    loginUser                // Login after registration
};
