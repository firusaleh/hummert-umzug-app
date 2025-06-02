const Mitarbeiter = require('../models/Mitarbeiter');
const { validationResult } = require('express-validator');

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const mitarbeiter = new Mitarbeiter(req.body);
    await mitarbeiter.save();

    res.status(201).json({
      success: true,
      data: mitarbeiter
    });
  } catch (error) {
    console.error('Create Mitarbeiter error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating Mitarbeiter' 
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { status, search } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { vorname: { $regex: search, $options: 'i' } },
        { nachname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const mitarbeiter = await Mitarbeiter.find(query).sort({ nachname: 1 });

    res.json({
      success: true,
      data: mitarbeiter
    });
  } catch (error) {
    console.error('Get all Mitarbeiter error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching Mitarbeiter' 
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const mitarbeiter = await Mitarbeiter.findById(req.params.id);

    if (!mitarbeiter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Mitarbeiter not found' 
      });
    }

    res.json({
      success: true,
      data: mitarbeiter
    });
  } catch (error) {
    console.error('Get Mitarbeiter error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching Mitarbeiter' 
    });
  }
};