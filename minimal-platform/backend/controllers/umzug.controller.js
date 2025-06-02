const Umzug = require('../models/Umzug');
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

    const umzug = new Umzug({
      ...req.body,
      createdBy: req.userId
    });
    
    await umzug.save();
    await umzug.populate('mitarbeiter createdBy', '-password');

    res.status(201).json({
      success: true,
      data: umzug
    });
  } catch (error) {
    console.error('Create Umzug error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating Umzug' 
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { kundenname: { $regex: search, $options: 'i' } },
        { 'vonAdresse.ort': { $regex: search, $options: 'i' } },
        { 'nachAdresse.ort': { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Umzug.countDocuments(query);
    const umzuege = await Umzug.find(query)
      .populate('mitarbeiter', 'vorname nachname')
      .populate('createdBy', 'name email')
      .sort({ datum: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      data: umzuege,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all Umzuege error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching Umzuege' 
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const umzug = await Umzug.findById(req.params.id)
      .populate('mitarbeiter')
      .populate('createdBy', 'name email');

    if (!umzug) {
      return res.status(404).json({ 
        success: false, 
        message: 'Umzug not found' 
      });
    }

    res.json({
      success: true,
      data: umzug
    });
  } catch (error) {
    console.error('Get Umzug error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching Umzug' 
    });
  }
};

exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const umzug = await Umzug.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('mitarbeiter')
    .populate('createdBy', 'name email');

    if (!umzug) {
      return res.status(404).json({ 
        success: false, 
        message: 'Umzug not found' 
      });
    }

    res.json({
      success: true,
      data: umzug
    });
  } catch (error) {
    console.error('Update Umzug error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating Umzug' 
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const umzug = await Umzug.findByIdAndDelete(req.params.id);

    if (!umzug) {
      return res.status(404).json({ 
        success: false, 
        message: 'Umzug not found' 
      });
    }

    res.json({
      success: true,
      message: 'Umzug deleted successfully'
    });
  } catch (error) {
    console.error('Delete Umzug error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting Umzug' 
    });
  }
};