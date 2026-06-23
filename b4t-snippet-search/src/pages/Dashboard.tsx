import React, { useEffect, useState } from 'react';
import { Users, Briefcase, FileText, Clock } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/data/dashboard').then(res => res.json()),
      fetch('/api/data/clients').then(res => res.json()),
      fetch('/api/data/projects').then(res => res.json())
    ]).then(([statsData, clientsData, projectsData]) => {
      setStats(statsData);
      setClients(clientsData || []);
      setProjects(projectsData || []);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading data...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Clients Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{stats?.clients?.toLocaleString()}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Briefcase className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Projects/Matters</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{stats?.projects?.toLocaleString()}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Invoices</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{stats?.invoices?.toLocaleString()}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Time Entries Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Time Entries</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{stats?.timeEntries?.toLocaleString()}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Clients */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Clients</h3>
          </div>
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {clients.slice(0, 50).map((client, i) => (
              <li key={client.internalClientId || i} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-blue-600 truncate">{client.clientName}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {client.email || 'No email'} • {client.phone || 'No phone'}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {client.clientStatus || 'Active'}
                  </div>
                </div>
              </li>
            ))}
            {clients.length === 0 && (
              <li className="px-6 py-4 text-center text-sm text-gray-500">No clients found</li>
            )}
          </ul>
        </div>

        {/* Recent Projects */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Projects / Matters</h3>
          </div>
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {projects.slice(0, 50).map((project, i) => (
              <li key={project.internalProjectId || i} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-blue-600 truncate">{project.projectName}</p>
                    <p className="text-sm text-gray-500 truncate">{project.clientName}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {project.status || 'Active'}
                  </div>
                </div>
              </li>
            ))}
            {projects.length === 0 && (
              <li className="px-6 py-4 text-center text-sm text-gray-500">No projects found</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
