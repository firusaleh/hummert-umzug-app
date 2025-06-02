import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const UmzugForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    kundenname: '',
    datum: '',
    vonAdresse: { strasse: '', plz: '', ort: '' },
    nachAdresse: { strasse: '', plz: '', ort: '' },
    telefon: '',
    email: '',
    status: 'geplant',
    mitarbeiter: [],
    notizen: ''
  });

  const [mitarbeiterList, setMitarbeiterList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMitarbeiter();
    if (isEdit) {
      fetchUmzug();
    }
  }, [id]);

  const fetchMitarbeiter = async () => {
    try {
      const response = await api.get('/mitarbeiter');
      setMitarbeiterList(response.data.data || []);
    } catch (error) {
      console.error('Error fetching Mitarbeiter:', error);
    }
  };

  const fetchUmzug = async () => {
    try {
      const response = await api.get(`/umzuege/${id}`);
      const umzug = response.data.data;
      setFormData({
        ...umzug,
        datum: umzug.datum.split('T')[0],
        mitarbeiter: umzug.mitarbeiter.map(m => m._id)
      });
    } catch (error) {
      console.error('Error fetching Umzug:', error);
      setError('Fehler beim Laden des Umzugs');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMitarbeiterChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, mitarbeiter: selected }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEdit) {
        await api.put(`/umzuege/${id}`, formData);
      } else {
        await api.post('/umzuege', formData);
      }
      navigate('/umzuege');
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        {isEdit ? 'Umzug bearbeiten' : 'Neuer Umzug'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Kundenname
            </label>
            <input
              type="text"
              name="kundenname"
              required
              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.kundenname}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Datum
            </label>
            <input
              type="date"
              name="datum"
              required
              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.datum}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="geplant">Geplant</option>
              <option value="bestaetigt">Bestätigt</option>
              <option value="in_durchfuehrung">In Durchführung</option>
              <option value="abgeschlossen">Abgeschlossen</option>
              <option value="storniert">Storniert</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Von Adresse</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  name="vonAdresse.strasse"
                  placeholder="Straße und Hausnummer"
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={formData.vonAdresse.strasse}
                  onChange={handleChange}
                />
              </div>
              <div>
                <input
                  type="text"
                  name="vonAdresse.plz"
                  placeholder="PLZ"
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={formData.vonAdresse.plz}
                  onChange={handleChange}
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  name="vonAdresse.ort"
                  placeholder="Ort"
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={formData.vonAdresse.ort}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Nach Adresse</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  name="nachAdresse.strasse"
                  placeholder="Straße und Hausnummer"
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={formData.nachAdresse.strasse}
                  onChange={handleChange}
                />
              </div>
              <div>
                <input
                  type="text"
                  name="nachAdresse.plz"
                  placeholder="PLZ"
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={formData.nachAdresse.plz}
                  onChange={handleChange}
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  name="nachAdresse.ort"
                  placeholder="Ort"
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={formData.nachAdresse.ort}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Telefon
            </label>
            <input
              type="tel"
              name="telefon"
              required
              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.telefon}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              E-Mail
            </label>
            <input
              type="email"
              name="email"
              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Mitarbeiter
            </label>
            <select
              multiple
              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.mitarbeiter}
              onChange={handleMitarbeiterChange}
            >
              {mitarbeiterList.map(m => (
                <option key={m._id} value={m._id}>
                  {m.vorname} {m.nachname}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Halten Sie Strg/Cmd gedrückt, um mehrere auszuwählen
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Notizen
            </label>
            <textarea
              name="notizen"
              rows={3}
              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.notizen}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/umzuege')}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UmzugForm;