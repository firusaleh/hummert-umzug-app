// controllers/clientController.js
const Client = require('../models/client');

// @desc    Create a new client
// @route   POST /api/clients
// @access  Private
exports.createClient = async (req, res) => {
  try {
    const client = await Client.create({
      ...req.body,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      error: 'Serverfehler bei der Erstellung des Kunden'
    });
  }
};

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
exports.getClients = async (req, res) => {
  try {
    const filter = {};
    
    // Optional: Filter nach Name
    if (req.query.name) {
      filter.name = { $regex: req.query.name, $options: 'i' };
    }
    
    // Optional: Filter nach Typ (Firma/Privat)
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    const clients = await Client.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients
    });
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({
      success: false,
      error: 'Serverfehler beim Abrufen der Kunden'
    });
  }
};

// @desc    Get client by ID
// @route   GET /api/clients/:id
// @access  Private
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate({
        path: 'projects',
        select: 'name startDate endDate status',
        options: { sort: { startDate: -1 } }
      });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Kunde nicht gefunden'
      });
    }
    
    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error getting client by id:', error);
    res.status(500).json({
      success: false,
      error: 'Serverfehler beim Abrufen des Kunden'
    });
  }
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
exports.updateClient = async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Kunde nicht gefunden'
      });
    }
    
    // Aktualisiere den Kunden
    client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({
      success: false,
      error: 'Serverfehler beim Aktualisieren des Kunden'
    });
  }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Kunde nicht gefunden'
      });
    }
    
    // Überprüfen, ob der Kunde mit Projekten verknüpft ist
    const projectCount = await Project.countDocuments({ client: req.params.id });
    
    if (projectCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Der Kunde kann nicht gelöscht werden, da ${projectCount} Projekte mit diesem Kunden verknüpft sind.`
      });
    }
    
    await client.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      error: 'Serverfehler beim Löschen des Kunden'
    });
  }
};

// @desc    Get client statistics
// @route   GET /api/clients/stats
// @access  Private/Admin
exports.getClientStats = async (req, res) => {
  try {
    // Gesamtzahl der Kunden
    const totalClients = await Client.countDocuments();
    
    // Anzahl der Kunden nach Typ
    const clientsByType = await Client.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Neueste Kunden (letzte 5)
    const recentClients = await Client.find()
      .select('name type email createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.status(200).json({
      success: true,
      data: {
        totalClients,
        clientsByType,
        recentClients
      }
    });
  } catch (error) {
    console.error('Error getting client stats:', error);
    res.status(500).json({
      success: false,
      error: 'Serverfehler beim Abrufen der Kundenstatistiken'
    });
  }
};