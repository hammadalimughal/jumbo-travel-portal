const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../env.json');
const User = require('../models/User');
const sendMail = require('../utils/sendMail');

// Generate random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// In-memory store for rate limiting (in production, use Redis)
const resetAttempts = new Map();

// Rate limiting helper
const checkRateLimit = (email) => {
    const now = Date.now();
    const attempts = resetAttempts.get(email) || { count: 0, lastAttempt: 0 };

    // Reset count if more than 1 hour has passed
    if (now - attempts.lastAttempt > 60 * 60 * 1000) {
        attempts.count = 0;
    }

    // Check if user has exceeded limit (5 attempts per hour)
    if (attempts.count >= 5) {
        return false;
    }

    // Update attempts
    attempts.count++;
    attempts.lastAttempt = now;
    resetAttempts.set(email, attempts);

    return true;
};

router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body

        if (name && email && password) {
            const checkUser = await User.findOne({ email })
            if (checkUser) {
                return res.status(400).json({ success: false, error: 'Email already exists' })
            }
            const salt = await bcrypt.genSalt(10)
            const hashPassword = await bcrypt.hash(password, salt)
            const newUser = await User.create({ name, email, phone, password: hashPassword })
            const fetchUser = await User.findOne({ email })
            const { _id } = fetchUser
            const user = {
                id: _id, name, phone, email
            }
            const authtoken = jwt.sign(user, JWT_SECRET);
            return res.status(200).cookie('authtoken', authtoken).json({ success: true, authtoken, user })
        }
        else {
            console.log(req.body)
            return res.status(400).json({ success: false, error: 'Fill all required fields' })
        }
    }
    catch (err) {
        console.log(err.message);
        return res.status(500).json({ success: false, error: err.message })
    }
})

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (email && password) {
            const checkUser = await User.findOne({ email })
            if (!checkUser) {
                return res.status(400).json({ success: false, error: 'Invalid Credentials' })
            }
            const checkPassword = await bcrypt.compare(password, checkUser.password)
            if (!checkPassword) {
                return res.status(400).json({ success: false, error: 'Invalid Credentials' })
            }
            const { _id } = checkUser
            const user = {
                id: _id, email
            }
            const authtoken = jwt.sign(user, JWT_SECRET);
            return res.status(200).cookie('authtoken', authtoken).json({ success: true, authtoken, user })
        }
        else {
            console.log(req.body)
            return res.status(400).json({ success: false, error: 'Fill all required fields' })
        }
    }
    catch (err) {
        console.log(err.message);
        return res.status(500).json({ success: false, error: err.message })
    }
})

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        // Check rate limiting
        if (!checkRateLimit(email)) {
            return res.status(400).json({ success: false, error: 'Too many reset attempts. Please try again after 1 hour.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, error: 'No account found with this email address' });
        }

        // Generate OTP and set expiration (10 minutes)
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Update user with OTP
        await User.findByIdAndUpdate(user._id, {
            resetPasswordOTP: otp,
            resetPasswordOTPExpires: otpExpires
        });

        // Send OTP email
        const emailSubject = 'Password Reset OTP - Mandha Construction';
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>Hello ${user.firstName},</p>
                <p>You have requested to reset your password. Please use the following OTP to proceed:</p>
                <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
                </div>
                <p style="color: #666;">This OTP will expire in 10 minutes.</p>
                <p style="color: #666;">If you didn't request this password reset, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999;">Mandha Construction Team</p>
            </div>
        `;
        try {
            console.log(`Sending OTP code: ${otp} to email: ${email}`);
            await sendMail(email, emailSubject, emailBody);
        } catch (error) {
            console.error('Error sending OTP email:', error);
        }

        return res.status(200).json({ success: true, message: 'OTP sent to your email address' });

    } catch (err) {
        console.log(err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, error: 'Email and OTP are required' });
        }

        const user = await User.findOne({
            email,
            resetPasswordOTP: otp,
            resetPasswordOTPExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
        }

        // OTP is valid, return reset token
        const resetToken = jwt.sign({ userId: user._id, email }, JWT_SECRET, { expiresIn: '15m' });
        return res.status(200).json({ success: true, resetToken, message: 'OTP verified successfully' });

    } catch (err) {
        console.log(err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, error: 'No account found with this email address' });
        }

        // Generate new OTP and set expiration (10 minutes)
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Update user with new OTP
        await User.findByIdAndUpdate(user._id, {
            resetPasswordOTP: otp,
            resetPasswordOTPExpires: otpExpires
        });

        // Send OTP email
        const emailSubject = 'Password Reset OTP - Mandha Construction';
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>Hello ${user.firstName},</p>
                <p>You have requested a new OTP for password reset. Please use the following OTP to proceed:</p>
                <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
                </div>
                <p style="color: #666;">This OTP will expire in 10 minutes.</p>
                <p style="color: #666;">If you didn't request this password reset, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999;">Mandha Construction Team</p>
            </div>
        `;
        try {
            console.log(`Resending OTP code: ${otp} to email: ${email}`);
            await sendMail(email, emailSubject, emailBody);
        } catch (error) {
            console.error('Error sending OTP email:', error);
        }

        return res.status(200).json({ success: true, message: 'New OTP sent to your email address' });

    } catch (err) {
        console.log(err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, error: 'Passwords do not match' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(400).json({ success: false, error: 'User not found' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear OTP fields
        await User.findByIdAndUpdate(user._id, {
            password: hashPassword,
            resetPasswordOTP: null,
            resetPasswordOTPExpires: null
        });

        return res.status(200).json({ success: true, message: 'Password reset successfully. Please login with your new password.' });

    } catch (err) {
        console.log(err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/logout', (req, res) => {
    res.clearCookie('authtoken');
    res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router