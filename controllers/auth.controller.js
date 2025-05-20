// controllers/auth.controller.js - Enhanced with security and validation
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { AppError, catchAsync } = require('../utils/error.utils');
const { sendEmail } = require('../utils/email');
const crypto = require('crypto');

// Create JWT Token with proper error handling
const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT_SECRET not configured', 500);
  }
  
  return jwt.sign(
    { id: user._id, name: user.name, role: user.role }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Create and send JWT token
const createSendToken = (user, statusCode, res) => {
  const token = createToken(user);
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    success: true,
    token,
    user
  });
};

// Register new user
exports.register = catchAsync(async (req, res, next) => {
  const { email, password, name, role } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('E-Mail-Adresse bereits registriert', 400));
  }
  
  // Create new user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'mitarbeiter'
  });
  
  createSendToken(user, 201, res);
});

// Login user
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Bitte E-Mail und Passwort angeben', 400));
  }
  
  // Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Ungültige Anmeldedaten', 401));
  }
  
  // Check if user is active
  if (user.isActive === false) {
    return next(new AppError('Dieses Konto wurde deaktiviert', 401));
  }
  
  // Update last login
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });
  
  createSendToken(user, 200, res);
});

// Get current user profile
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');
  
  if (!user) {
    return next(new AppError('Benutzer nicht gefunden', 404));
  }
  
  res.json({
    success: true,
    user
  });
});

// Check authentication status
exports.checkAuth = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');
  
  if (!user) {
    return next(new AppError('Nicht authentifiziert', 401));
  }
  
  res.json({
    success: true,
    user
  });
});

// Create admin user (protected route)
exports.createAdmin = catchAsync(async (req, res, next) => {
  const { email, password, name } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('E-Mail-Adresse bereits registriert', 400));
  }
  
  // Create admin user
  const admin = await User.create({
    name,
    email,
    password,
    role: 'admin'
  });
  
  createSendToken(admin, 201, res);
});

// Change password
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  // Get user from collection
  const user = await User.findById(req.user.id).select('+password');
  
  // Check if current password is correct
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Aktuelles Passwort ist falsch', 401));
  }
  
  // Update password
  user.password = newPassword;
  await user.save();
  
  createSendToken(user, 200, res);
});

// Request password reset
exports.resetPasswordRequest = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  // Get user based on email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('Kein Benutzer mit dieser E-Mail-Adresse gefunden', 404));
  }
  
  // Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  
  // Send reset email
  const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
  
  try {
    await sendEmail({
      email: user.email,
      subject: 'Passwort zurücksetzen',
      message: `Um Ihr Passwort zurückzusetzen, klicken Sie bitte auf folgenden Link: ${resetURL}`
    });
    
    res.status(200).json({
      success: true,
      message: 'E-Mail zum Zurücksetzen des Passworts wurde gesendet'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    
    return next(new AppError('E-Mail konnte nicht gesendet werden', 500));
  }
});

// Reset password
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  
  // Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
  
  if (!user) {
    return next(new AppError('Token ist ungültig oder abgelaufen', 400));
  }
  
  // Set new password
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  
  createSendToken(user, 200, res);
});

// Update user profile
exports.updateProfile = catchAsync(async (req, res, next) => {
  const { name, email, telefon, adresse } = req.body;
  
  // Don't allow password updates through this route
  if (req.body.password) {
    return next(new AppError('Diese Route ist nicht für Passwort-Updates. Bitte /change-password verwenden', 400));
  }
  
  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { name, email, telefon, adresse },
    {
      new: true,
      runValidators: true
    }
  ).select('-password');
  
  res.json({
    success: true,
    user: updatedUser
  });
});

// Logout (client-side token removal)
exports.logout = (req, res) => {
  res.json({
    success: true,
    message: 'Erfolgreich abgemeldet'
  });
};