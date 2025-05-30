// controllers/auth.controller.js - Enhanced with security and validation
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { AppError, catchAsync } = require('../utils/error.utils');
const { sendEmail } = require('../utils/email');
const crypto = require('crypto');

// Create JWT Tokens with proper error handling
const createTokens = (user) => {
  // Fallback to development secrets if not set in env
  const jwtSecret = process.env.JWT_SECRET || 'development_secret_key_replace_in_production';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret_key_change_in_production';
  
  if (!process.env.JWT_SECRET) {
    console.warn('WARNUNG: JWT_SECRET nicht definiert in Umgebungsvariablen! Verwende Fallback-Schlüssel.');
  }
  
  // Convert Mongoose ObjectId to string for better compatibility
  const userId = user._id.toString();
  
  const accessToken = jwt.sign(
    { 
      id: userId, 
      name: user.name, 
      role: user.role,
      email: user.email 
    }, 
    jwtSecret, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    refreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

// Legacy function for backward compatibility
const createToken = (user) => {
  return createTokens(user).accessToken;
};

// Create and send JWT tokens
const createSendToken = (user, statusCode, res) => {
  const { accessToken, refreshToken } = createTokens(user);
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    success: true,
    token: accessToken,
    refreshToken,
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
  
  console.log(`Login attempt for email: ${email}`);
  
  // Check if user exists
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    console.log(`User not found: ${email}`);
    return next(new AppError('Ungültige Anmeldedaten', 401));
  }
  
  // Check if password is correct
  const isPasswordCorrect = await user.comparePassword(password);
  
  if (!isPasswordCorrect) {
    console.log(`Invalid password for user: ${email}`);
    return next(new AppError('Ungültige Anmeldedaten', 401));
  }
  
  // Check if user is active
  if (user.isActive === false) {
    console.log(`Inactive account: ${email}`);
    return next(new AppError('Dieses Konto wurde deaktiviert', 401));
  }
  
  // Update last login
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });
  
  console.log(`Successful login for: ${email}`);
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

// Refresh token
exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return next(new AppError('Refresh token required', 401));
  }
  
  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret_key_change_in_production';
    const decoded = jwt.verify(refreshToken, refreshSecret);
    
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new AppError('Invalid refresh token', 401));
    }
    
    const { accessToken, refreshToken: newRefreshToken } = createTokens(user);
    
    res.json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    return next(new AppError('Invalid refresh token', 401));
  }
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