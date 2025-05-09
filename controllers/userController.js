// controllers/userController.js
const User = require('../models/user');
const { validationResult } = require('express-validator');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email } = req.body;

    // Prüfen, ob Email oder Username bereits vergeben ist
    if (username || email) {
      const existingUser = await User.findOne({
        $or: [
          { username, _id: { $ne: req.user.id } },
          { email, _id: { $ne: req.user.id } }
        ]
      });

      if (existingUser) {
        return res.status(400).json({ 
          message: 'Benutzername oder E-Mail wird bereits verwendet' 
        });
      }
    }

    const updateFields = {};
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.json({
      message: 'Profil erfolgreich aktualisiert',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};
