const express = require("express");
const router = express.Router();
const { startRegistration, loginUser, verifyRegistrationOTP, resendRegistrationOTP } = require("../controllers/authController");


router.post('/register', startRegistration);
router.post('/verify-otp', verifyRegistrationOTP);
router.post('/resend-otp', resendRegistrationOTP);
router.post('/login', loginUser);

module.exports = router;
