import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const UmzugList = () => {
  const [umzuege, setUmzuege] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchUmzuege();
  }, [search, status]);

  const fetchUmzuege = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (status) params.status = status;

      const response = await api.get('/umzuege', { params });
      setUmzuege(response.data.data || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Error fetching Umzuege:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Möchten Sie diesen Umzug wirklich löschen?')) {
      try {
        await api.delete(`/umzuege/${id}`);
        fetchUmzuege();
      } catch (error) {
        console.error('Error deleting Umzug:', error);
        alert('Fehler beim Löschen des Umzugs');
      }
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      geplant: 'bg-yellow-100 text-yellow-800',
      bestaetigt: 'bg-green-100 text-green-800',
      in_durchfuehrung: 'bg-blue-100 text-blue-800',
      abgeschlossen: 'bg-gray-100 text-gray-800',
      storniert: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Umzüge</h1>
        <Link
          to="/umzuege/neu"
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Neuer Umzug
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Suchen..."
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Alle Status</option>
          <option value="geplant">Geplant</option>
          <option value="bestaetigt">Bestätigt</option>
          <option value="in_durchfuehrung">In Durchführung</option>
          <option value="abgeschlossen">Abgeschlossen</option>
          <option value="storniert">Storniert</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {umzuege.map((umzug) => (
              <li key={umzug._id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {umzug.kundenname}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {new Date(umzug.datum).toLocaleDateString('de-DE')} • 
                        Von: {umzug.vonAdresse.ort} → Nach: {umzug.nachAdresse.ort}
                      </p>
                    </div>
                    <div className="ml-2 flex items-center space-x-2">
                      {getStatusBadge(umzug.status)}
                      <Link
                        to={`/umzuege/${umzug._id}/bearbeiten`}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Bearbeiten
                      </Link>
                      <button
                        onClick={() => handleDelete(umzug._id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {umzuege.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Keine Umzüge gefunden</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UmzugList;