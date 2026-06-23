import React, { useEffect, useState } from 'react';
import { Users, Briefcase, FileText, Clock } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/data/dashboard').then(res => res.json()),
      fetch('/api/data/report').then(res => res.json())
    ]).then(([statsData, report]) => {
      setStats(statsData);
      setReportData(Array.isArray(report) ? report : []);
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

      <div className="space-y-6 overflow-x-auto">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Snippet Search Report</h2>
          <p className="text-sm text-gray-500">
            Advanced Master View with calculated balances, tier notes, and attorney assignments.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Payments</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Terms</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">T-Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.slice(0, 100).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 truncate max-w-xs">{row.ClientName}</div>
                      <div className="text-gray-500">{row.Email}</div>
                      <div className="text-gray-500">{row.Phone}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                      {row.Status}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                      <div>1st: {row.FirstAttorney || '-'}</div>
                      <div>Last: {row.LastAttorney || '-'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                      <div>Retainer: ${row.RetainerPaid}</div>
                      <div>Total: ${row.TotalAmountPaid}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                      {row.PaymentTerms}
                    </td>
                    <td className="px-4 py-4 text-gray-500 max-w-md truncate" title={row.T_ClientCare_Notes}>
                      {row.T_ClientCare_Notes || 'None'}
                    </td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-gray-500">No report data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
