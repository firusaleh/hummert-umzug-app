import React, { useState, useEffect } from 'react';
import api from '../services/api';

const MitarbeiterList = () => {
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    position: '',
    status: 'aktiv'
  });

  useEffect(() => {
    fetchMitarbeiter();
  }, []);

  const fetchMitarbeiter = async () => {
    try {
      setLoading(true);
      const response = await api.get('/mitarbeiter');
      setMitarbeiter(response.data.data || []);
    } catch (error) {
      console.error('Error fetching Mitarbeiter:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/mitarbeiter', formData);
      setShowForm(false);
      setFormData({
        vorname: '',
        nachname: '',
        email: '',
        telefon: '',
        position: '',
        status: 'aktiv'
      });
      fetchMitarbeiter();
    } catch (error) {
      console.error('Error creating Mitarbeiter:', error);
      alert('Fehler beim Erstellen des Mitarbeiters');
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Mitarbeiter</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          {showForm ? 'Abbrechen' : 'Neuer Mitarbeiter'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Neuen Mitarbeiter anlegen
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  name="vorname"
                  placeholder="Vorname"
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.vorname}
                  onChange={handleChange}
                />
                <input
                  type="text"
                  name="nachname"
                  placeholder="Nachname"
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.nachname}
                  onChange={handleChange}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="E-Mail"
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.email}
                  onChange={handleChange}
                />
                <input
                  type="tel"
                  name="telefon"
                  placeholder="Telefon"
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.telefon}
                  onChange={handleChange}
                />
                <input
                  type="text"
                  name="position"
                  placeholder="Position"
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.position}
                  onChange={handleChange}
                />
                <select
                  name="status"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="aktiv">Aktiv</option>
                  <option value="inaktiv">Inaktiv</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {mitarbeiter.map((person) => (
              <li key={person._id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {person.vorname} {person.nachname}
                      </p>
                      <p className="text-sm text-gray-500">
                        {person.position} • {person.email} • {person.telefon}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      person.status === 'aktiv' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {person.status}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {mitarbeiter.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Keine Mitarbeiter vorhanden</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MitarbeiterList;