import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    umzuege: 0,
    mitarbeiter: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [umzuegeRes, mitarbeiterRes] = await Promise.all([
        api.get('/umzuege?limit=1'),
        api.get('/mitarbeiter')
      ]);

      setStats({
        umzuege: umzuegeRes.data.pagination?.total || 0,
        mitarbeiter: mitarbeiterRes.data.data?.length || 0,
        pending: umzuegeRes.data.data?.filter(u => u.status === 'geplant').length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Gesamt Umzüge
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.umzuege}
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <Link to="/umzuege" className="text-sm text-blue-600 hover:text-blue-500">
              Alle anzeigen →
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Aktive Mitarbeiter
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.mitarbeiter}
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <Link to="/mitarbeiter" className="text-sm text-blue-600 hover:text-blue-500">
              Verwalten →
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Anstehende Umzüge
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.pending}
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <Link to="/umzuege/neu" className="text-sm text-blue-600 hover:text-blue-500">
              Neuer Umzug →
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Schnellzugriff</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            to="/umzuege/neu"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
          >
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Neuen Umzug anlegen</p>
              <p className="text-sm text-gray-500">Erstellen Sie einen neuen Umzugsauftrag</p>
            </div>
          </Link>

          <Link
            to="/mitarbeiter"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
          >
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Mitarbeiter verwalten</p>
              <p className="text-sm text-gray-500">Mitarbeiterdaten einsehen und verwalten</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;