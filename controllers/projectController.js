// controllers/projectController.js
const Project = require('../models/project');
const Client = require('../models/client');
const { validationResult } = require('express-validator');

exports.createProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, client, startDate, endDate, status, team } = req.body;

    // Prüfen, ob Client existiert
    const clientExists = await Client.findById(client);
    if (!clientExists) {
      return res.status(404).json({ message: 'Client nicht gefunden' });
    }

    const project = new Project({
      name,
      description,
      client,
      startDate,
      endDate,
      status,
      team,
      createdBy: req.user.id
    });

    await project.save();

    // Projekt zur Client-Liste hinzufügen
    await Client.findByIdAndUpdate(
      client,
      { $push: { projects: project._id } }
    );

    res.status(201).json({
      message: 'Projekt erfolgreich erstellt',
      project
    });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const { status, client } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (client) filter.client = client;
    
    const projects = await Project.find(filter)
      .populate('client', 'name contactPerson')
      .populate('team', 'username email')
      .sort({ createdAt: -1 });
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name contactPerson email phone')
      .populate('team', 'username email')
      .populate('tasks')
      .populate('createdBy', 'username');
    
    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, client, startDate, endDate, status, team } = req.body;
    
    // Wenn Client geändert wird, prüfen, ob neuer Client existiert
    if (client) {
      const clientExists = await Client.findById(client);
      if (!clientExists) {
        return res.status(404).json({ message: 'Client nicht gefunden' });
      }
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }

    // Wenn sich der Client ändert, altes und neues Client-Dokument aktualisieren
    if (client && project.client.toString() !== client) {
      // Projekt aus altem Client entfernen
      await Client.findByIdAndUpdate(
        project.client,
        { $pull: { projects: project._id } }
      );
      
      // Projekt zum neuen Client hinzufügen
      await Client.findByIdAndUpdate(
        client,
        { $push: { projects: project._id } }
      );
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { 
        $set: {
          name: name || project.name,
          description: description || project.description,
          client: client || project.client,
          startDate: startDate || project.startDate,
          endDate: endDate || project.endDate,
          status: status || project.status,
          team: team || project.team
        }
      },
      { new: true }
    )
    .populate('client', 'name contactPerson')
    .populate('team', 'username email');

    res.json({
      message: 'Projekt erfolgreich aktualisiert',
      project: updatedProject
    });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }

    // Projekt aus Client-Liste entfernen
    await Client.findByIdAndUpdate(
      project.client,
      { $pull: { projects: project._id } }
    );

    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: 'Projekt erfolgreich gelöscht' });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};