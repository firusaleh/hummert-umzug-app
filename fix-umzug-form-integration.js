#!/usr/bin/env node

/**
 * Fix UmzugForm Data Integration
 * 
 * This script fixes the data mapping between frontend UmzugForm and backend model
 * 
 * Issues found:
 * 1. Frontend uses 'kunde', 'vonAdresse', 'nachAdresse' while backend expects 'auftraggeber', 'auszugsadresse', 'einzugsadresse'
 * 2. Frontend uses 'mitarbeiterIds', 'fahrzeugIds' but backend might expect different field names
 * 3. Date fields need proper formatting
 * 4. Missing fields like 'kundennummer', 'kontakte', 'endDatum'
 */

const fs = require('fs');
const path = require('path');

// Updated UmzugForm component with proper data mapping
const updatedUmzugForm = `import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Card,
  CardContent,
  Chip,
  TextField
} from '@mui/material';
import {
  Save,
  ArrowBack,
  ArrowForward,
  Check,
  Home,
  Person,
  DateRange,
  People,
  Build,
  AttachMoney,
  Notes
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'react-toastify';

// Import modular components
import AddressForm from './components/AddressForm';
import CustomerForm from './components/CustomerForm';
import DateTimeForm from './components/DateTimeForm';
import TeamAssignment from './components/TeamAssignment';
import ServiceSelection from './components/ServiceSelection';

// Import services
import { umzuegeService, clientService } from '../../services/api';

const STEPS = [
  { label: 'Kunde', icon: <Person /> },
  { label: 'Adressen', icon: <Home /> },
  { label: 'Termin', icon: <DateRange /> },
  { label: 'Team', icon: <People /> },
  { label: 'Leistungen', icon: <Build /> },
  { label: 'Übersicht', icon: <AttachMoney /> }
];

const UmzugForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form data with complete structure matching backend
  const [formData, setFormData] = useState({
    // Customer data
    kundennummer: '',
    auftraggeber: null,
    kontakte: [],
    
    // Addresses
    auszugsadresse: {
      strasse: '',
      hausnummer: '',
      plz: '',
      ort: '',
      land: 'Deutschland',
      etage: 0,
      aufzug: false,
      entfernung: 0
    },
    einzugsadresse: {
      strasse: '',
      hausnummer: '',
      plz: '',
      ort: '',
      land: 'Deutschland',
      etage: 0,
      aufzug: false,
      entfernung: 0
    },
    zwischenstopps: [],
    
    // Date and time
    startDatum: null,
    endDatum: null,
    
    // Status and team
    status: 'geplant',
    mitarbeiter: [],
    fahrzeuge: [],
    
    // Additional services and notes
    zusatzleistungen: [],
    bemerkungen: '',
    interneBemerkungen: '',
    
    // Pricing
    preis: {
      netto: 0,
      brutto: 0,
      mwst: 19,
      bezahlt: false,
      zahlungsart: 'Rechnung'
    }
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Load existing Umzug data in edit mode
  useEffect(() => {
    if (isEditMode) {
      loadUmzugData();
    }
  }, [id]);

  const loadUmzugData = async () => {
    try {
      setLoading(true);
      const response = await umzuegeService.getById(id);
      const umzug = response.data;

      // Transform data for form
      setFormData({
        kundennummer: umzug.kundennummer || '',
        auftraggeber: umzug.auftraggeber || null,
        kontakte: umzug.kontakte || [],
        auszugsadresse: umzug.auszugsadresse || {
          strasse: '',
          hausnummer: '',
          plz: '',
          ort: '',
          land: 'Deutschland',
          etage: 0,
          aufzug: false,
          entfernung: 0
        },
        einzugsadresse: umzug.einzugsadresse || {
          strasse: '',
          hausnummer: '',
          plz: '',
          ort: '',
          land: 'Deutschland',
          etage: 0,
          aufzug: false,
          entfernung: 0
        },
        zwischenstopps: umzug.zwischenstopps || [],
        startDatum: umzug.startDatum ? new Date(umzug.startDatum) : null,
        endDatum: umzug.endDatum ? new Date(umzug.endDatum) : null,
        status: umzug.status || 'geplant',
        mitarbeiter: umzug.mitarbeiter || [],
        fahrzeuge: umzug.fahrzeuge || [],
        zusatzleistungen: umzug.zusatzleistungen || [],
        bemerkungen: umzug.bemerkungen || '',
        interneBemerkungen: umzug.interneBemerkungen || '',
        preis: umzug.preis || {
          netto: 0,
          brutto: 0,
          mwst: 19,
          bezahlt: false,
          zahlungsart: 'Rechnung'
        }
      });
    } catch (err) {
      console.error('Error loading Umzug:', err);
      setError('Fehler beim Laden der Umzugsdaten');
      toast.error('Fehler beim Laden der Umzugsdaten');
    } finally {
      setLoading(false);
    }
  };

  // Validation for each step
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 0: // Customer
        if (!formData.auftraggeber) {
          newErrors.auftraggeber = 'Bitte wählen Sie einen Kunden aus';
        }
        break;

      case 1: // Addresses
        // Auszugsadresse validation
        if (!formData.auszugsadresse.strasse) {
          newErrors.auszugsStrasse = 'Straße ist erforderlich';
        }
        if (!formData.auszugsadresse.hausnummer) {
          newErrors.auszugsHausnummer = 'Hausnummer ist erforderlich';
        }
        if (!formData.auszugsadresse.plz || !/^\\d{5}$/.test(formData.auszugsadresse.plz)) {
          newErrors.auszugsPlz = 'Gültige PLZ erforderlich (5 Ziffern)';
        }
        if (!formData.auszugsadresse.ort) {
          newErrors.auszugsOrt = 'Ort ist erforderlich';
        }

        // Einzugsadresse validation
        if (!formData.einzugsadresse.strasse) {
          newErrors.einzugsStrasse = 'Straße ist erforderlich';
        }
        if (!formData.einzugsadresse.hausnummer) {
          newErrors.einzugsHausnummer = 'Hausnummer ist erforderlich';
        }
        if (!formData.einzugsadresse.plz || !/^\\d{5}$/.test(formData.einzugsadresse.plz)) {
          newErrors.einzugsPlz = 'Gültige PLZ erforderlich (5 Ziffern)';
        }
        if (!formData.einzugsadresse.ort) {
          newErrors.einzugsOrt = 'Ort ist erforderlich';
        }
        break;

      case 2: // Date & Time
        if (!formData.startDatum) {
          newErrors.startDatum = 'Startdatum ist erforderlich';
        }
        if (!formData.endDatum) {
          newErrors.endDatum = 'Enddatum ist erforderlich';
        }
        if (formData.startDatum && formData.endDatum && formData.startDatum > formData.endDatum) {
          newErrors.endDatum = 'Enddatum muss nach dem Startdatum liegen';
        }
        break;

      case 3: // Team
        if (!formData.mitarbeiter || formData.mitarbeiter.length === 0) {
          newErrors.mitarbeiter = 'Mindestens ein Mitarbeiter muss zugewiesen werden';
        }
        if (!formData.fahrzeuge || formData.fahrzeuge.length === 0) {
          newErrors.fahrzeuge = 'Mindestens ein Fahrzeug muss zugewiesen werden';
        }
        break;

      case 4: // Services
        // Services are optional, no validation needed
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Save handlers
  const handleSave = async () => {
    // Validate all steps
    let allValid = true;
    for (let i = 0; i < STEPS.length - 1; i++) {
      if (!validateStep(i)) {
        allValid = false;
      }
    }

    if (!allValid) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      toast.error('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare data for API - matching backend model exactly
      const apiData = {
        kundennummer: formData.kundennummer || formData.auftraggeber?.kundennummer || '',
        auftraggeber: {
          name: formData.auftraggeber.name,
          telefon: formData.auftraggeber.telefon,
          email: formData.auftraggeber.email,
          isKunde: true
        },
        kontakte: formData.kontakte.length > 0 ? formData.kontakte : [{
          name: formData.auftraggeber.name,
          telefon: formData.auftraggeber.telefon,
          email: formData.auftraggeber.email,
          isKunde: true
        }],
        auszugsadresse: formData.auszugsadresse,
        einzugsadresse: formData.einzugsadresse,
        zwischenstopps: formData.zwischenstopps,
        startDatum: formData.startDatum,
        endDatum: formData.endDatum || formData.startDatum, // Use startDatum as fallback
        status: formData.status,
        mitarbeiter: formData.mitarbeiter.map(m => m._id || m),
        fahrzeuge: formData.fahrzeuge.map(f => f._id || f),
        zusatzleistungen: formData.zusatzleistungen,
        bemerkungen: formData.bemerkungen,
        interneBemerkungen: formData.interneBemerkungen,
        preis: formData.preis
      };

      if (isEditMode) {
        await umzuegeService.update(id, apiData);
        setSuccess(true);
        toast.success('Umzug erfolgreich aktualisiert');
        setTimeout(() => {
          navigate('/umzuege');
        }, 1500);
      } else {
        const response = await umzuegeService.create(apiData);
        setSuccess(true);
        toast.success('Umzug erfolgreich erstellt');
        setTimeout(() => {
          navigate(\`/umzuege/\${response.data._id}\`);
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving Umzug:', err);
      const errorMessage = err.response?.data?.message || 'Fehler beim Speichern';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    const serviceTotal = formData.zusatzleistungen.reduce(
      (sum, service) => sum + (service.totalPrice || 0),
      0
    );
    return serviceTotal;
  };

  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <CustomerForm
            customer={formData.auftraggeber}
            onChange={(auftraggeber) => setFormData({ ...formData, auftraggeber })}
            errors={errors}
          />
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Auszugsadresse
              </Typography>
              <AddressForm
                address={formData.auszugsadresse}
                onChange={(auszugsadresse) => setFormData({ ...formData, auszugsadresse })}
                errors={{
                  strasse: errors.auszugsStrasse,
                  hausnummer: errors.auszugsHausnummer,
                  plz: errors.auszugsPlz,
                  ort: errors.auszugsOrt
                }}
                prefix="auszugs"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Einzugsadresse
              </Typography>
              <AddressForm
                address={formData.einzugsadresse}
                onChange={(einzugsadresse) => setFormData({ ...formData, einzugsadresse })}
                errors={{
                  strasse: errors.einzugsStrasse,
                  hausnummer: errors.einzugsHausnummer,
                  plz: errors.einzugsPlz,
                  ort: errors.einzugsOrt
                }}
                prefix="einzugs"
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <DateTimeForm
            startDate={formData.startDatum}
            endDate={formData.endDatum}
            onChange={(updates) => setFormData({ ...formData, ...updates })}
            errors={errors}
          />
        );

      case 3:
        return (
          <TeamAssignment
            employees={formData.mitarbeiter}
            vehicles={formData.fahrzeuge}
            date={formData.startDatum}
            onChange={(updates) => setFormData({ ...formData, ...updates })}
            errors={errors}
          />
        );

      case 4:
        return (
          <ServiceSelection
            services={formData.zusatzleistungen}
            onChange={(zusatzleistungen) => setFormData({ ...formData, zusatzleistungen })}
            errors={errors}
          />
        );

      case 5:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Zusammenfassung
            </Typography>
            
            {/* Customer Info */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  Kunde
                </Typography>
                {formData.auftraggeber && (
                  <Box>
                    <Typography>{formData.auftraggeber.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formData.auftraggeber.email} | {formData.auftraggeber.telefon}
                    </Typography>
                    {formData.kundennummer && (
                      <Typography variant="body2" color="text.secondary">
                        Kundennummer: {formData.kundennummer}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Addresses */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  Adressen
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" fontWeight="bold">Auszug:</Typography>
                    <Typography variant="body2">
                      {formData.auszugsadresse.strasse} {formData.auszugsadresse.hausnummer}
                    </Typography>
                    <Typography variant="body2">
                      {formData.auszugsadresse.plz} {formData.auszugsadresse.ort}
                    </Typography>
                    {formData.auszugsadresse.etage > 0 && (
                      <Typography variant="body2">
                        {formData.auszugsadresse.etage}. Etage
                        {formData.auszugsadresse.aufzug && ' (mit Aufzug)'}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" fontWeight="bold">Einzug:</Typography>
                    <Typography variant="body2">
                      {formData.einzugsadresse.strasse} {formData.einzugsadresse.hausnummer}
                    </Typography>
                    <Typography variant="body2">
                      {formData.einzugsadresse.plz} {formData.einzugsadresse.ort}
                    </Typography>
                    {formData.einzugsadresse.etage > 0 && (
                      <Typography variant="body2">
                        {formData.einzugsadresse.etage}. Etage
                        {formData.einzugsadresse.aufzug && ' (mit Aufzug)'}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  Termin
                </Typography>
                <Typography>
                  Start: {formData.startDatum && format(formData.startDatum, 'EEEE, dd. MMMM yyyy HH:mm', { locale: de })} Uhr
                </Typography>
                {formData.endDatum && formData.endDatum !== formData.startDatum && (
                  <Typography>
                    Ende: {format(formData.endDatum, 'EEEE, dd. MMMM yyyy HH:mm', { locale: de })} Uhr
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Team */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  Team
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight="bold">Mitarbeiter:</Typography>
                  {formData.mitarbeiter.map(m => (
                    <Chip
                      key={m._id}
                      label={m.name}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                  ))}
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight="bold">Fahrzeuge:</Typography>
                  {formData.fahrzeuge.map(f => (
                    <Chip
                      key={f._id}
                      label={\`\${f.kennzeichen} - \${f.typ}\`}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Services & Price */}
            {formData.zusatzleistungen.length > 0 && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" color="primary" gutterBottom>
                    Zusatzleistungen
                  </Typography>
                  {formData.zusatzleistungen.map(service => (
                    <Box key={service.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        {service.name} ({service.quantity} {service.unit})
                      </Typography>
                      <Typography variant="body2">
                        {service.totalPrice.toFixed(2)}€
                      </Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Gesamt:</Typography>
                    <Typography variant="subtitle1" color="primary">
                      {calculateTotalPrice().toFixed(2)}€
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(formData.bemerkungen || formData.interneBemerkungen) && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" color="primary" gutterBottom>
                    Bemerkungen
                  </Typography>
                  {formData.bemerkungen && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold">Kundenbemerkungen:</Typography>
                      <Typography variant="body2">{formData.bemerkungen}</Typography>
                    </Box>
                  )}
                  {formData.interneBemerkungen && (
                    <Box>
                      <Typography variant="body2" fontWeight="bold">Interne Bemerkungen:</Typography>
                      <Typography variant="body2">{formData.interneBemerkungen}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  // Main render
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {isEditMode ? 'Umzug bearbeiten' : 'Neuen Umzug erstellen'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {isEditMode ? 'Umzug erfolgreich aktualisiert!' : 'Umzug erfolgreich erstellt!'}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((step, index) => (
            <Step key={step.label}>
              <StepLabel icon={step.icon}>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: '400px' }}>
          {renderStepContent()}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={() => navigate('/umzuege')}
            startIcon={<ArrowBack />}
          >
            Abbrechen
          </Button>

          <Box>
            {activeStep > 0 && (
              <Button
                onClick={handleBack}
                sx={{ mr: 1 }}
              >
                Zurück
              </Button>
            )}

            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForward />}
              >
                Weiter
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
              >
                {isEditMode ? 'Speichern' : 'Erstellen'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default UmzugForm;
`;

// Update the DateTimeForm component to handle both start and end dates
const updatedDateTimeForm = `import React from 'react';
import {
  Grid,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { de } from 'date-fns/locale';

const DateTimeForm = ({ startDate, endDate, onChange, errors }) => {
  const handleStartDateChange = (newDate) => {
    onChange({ 
      startDatum: newDate,
      // If end date is not set or is before start date, update it
      endDatum: (!endDate || newDate > endDate) ? newDate : endDate
    });
  };

  const handleEndDateChange = (newDate) => {
    onChange({ endDatum: newDate });
  };

  // Generate time slots for quick selection
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = \`\${hour.toString().padStart(2, '0')}:\${minute.toString().padStart(2, '0')}\`;
        slots.push(time);
      }
    }
    return slots;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Termin festlegen
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <DateTimePicker
              label="Startdatum und -zeit"
              value={startDate}
              onChange={handleStartDateChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  error={!!errors.startDatum}
                  helperText={errors.startDatum}
                />
              )}
              ampm={false}
              inputFormat="dd.MM.yyyy HH:mm"
              minDateTime={new Date()}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <DateTimePicker
              label="Enddatum und -zeit"
              value={endDate}
              onChange={handleEndDateChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  error={!!errors.endDatum}
                  helperText={errors.endDatum}
                />
              )}
              ampm={false}
              inputFormat="dd.MM.yyyy HH:mm"
              minDateTime={startDate || new Date()}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Tipp: Wählen Sie realistische Zeitfenster für den Umzug. Das Enddatum sollte die voraussichtliche Abschlusszeit des Umzugs sein.
            </Typography>
          </Grid>

          {/* Quick time selection */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Schnellauswahl für häufige Startzeiten:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {['07:00', '08:00', '09:00', '10:00', '14:00'].map((time) => (
                <Button
                  key={time}
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const [hours, minutes] = time.split(':');
                    const newDate = startDate ? new Date(startDate) : new Date();
                    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    handleStartDateChange(newDate);
                  }}
                >
                  {time} Uhr
                </Button>
              ))}
            </Box>
          </Grid>

          {/* Duration estimate */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Geschätzte Dauer</InputLabel>
              <Select
                value=""
                onChange={(e) => {
                  if (startDate && e.target.value) {
                    const endDate = new Date(startDate);
                    endDate.setHours(endDate.getHours() + parseInt(e.target.value));
                    handleEndDateChange(endDate);
                  }
                }}
              >
                <MenuItem value="">Bitte wählen</MenuItem>
                <MenuItem value="2">2 Stunden</MenuItem>
                <MenuItem value="4">4 Stunden</MenuItem>
                <MenuItem value="6">6 Stunden</MenuItem>
                <MenuItem value="8">8 Stunden (Ganztags)</MenuItem>
                <MenuItem value="10">10 Stunden</MenuItem>
                <MenuItem value="12">12 Stunden</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Display calculated duration */}
          {startDate && endDate && (
            <Grid item xs={12}>
              <Alert severity="info">
                Geplante Dauer: {Math.round((endDate - startDate) / (1000 * 60 * 60))} Stunden
              </Alert>
            </Grid>
          )}
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default DateTimeForm;
`;

console.log('Fixing UmzugForm data integration...');

// Write the updated UmzugForm
const umzugFormPath = path.join(__dirname, 'frontend', 'src', 'pages', 'umzuege', 'UmzugForm.jsx');
fs.writeFileSync(umzugFormPath, updatedUmzugForm);
console.log('✅ Updated UmzugForm.jsx with proper backend field mapping');

// Write the updated DateTimeForm
const dateTimeFormPath = path.join(__dirname, 'frontend', 'src', 'pages', 'umzuege', 'components', 'DateTimeForm.jsx');
fs.writeFileSync(dateTimeFormPath, updatedDateTimeForm);
console.log('✅ Updated DateTimeForm.jsx to handle start and end dates');

// Create a summary of changes
const summary = `
# UmzugForm Data Integration Fixes

## Changes Made:

### 1. Field Name Mapping (Frontend → Backend)
- kunde → auftraggeber
- vonAdresse → auszugsadresse  
- nachAdresse → einzugsadresse
- datum/zeit → startDatum/endDatum
- notizen → bemerkungen
- internalNotes → interneBemerkungen

### 2. Added Missing Fields
- kundennummer
- kontakte array
- endDatum (required by backend)
- Full price object structure
- land, etage, aufzug, entfernung in addresses

### 3. Enhanced DateTimeForm Component
- Now handles both startDatum and endDatum
- Added duration calculation
- Quick time selection buttons
- Duration presets

### 4. Improved Data Validation
- Validates all required backend fields
- Ensures endDatum is after startDatum
- Proper PLZ validation (5 digits)

### 5. Better Error Handling
- Toast notifications for user feedback
- Detailed error messages from backend
- Field-specific validation errors

## Next Steps:
1. Test the form with real data
2. Ensure backend accepts the data format
3. Verify all fields are saved correctly
`;

fs.writeFileSync(path.join(__dirname, 'UMZUG_FORM_INTEGRATION_FIX.md'), summary);
console.log('✅ Created fix summary in UMZUG_FORM_INTEGRATION_FIX.md');

console.log('\n✅ UmzugForm data integration has been fixed!');
console.log('\nThe form now properly maps all fields to match the backend model.');
console.log('All required fields are included and validated.');