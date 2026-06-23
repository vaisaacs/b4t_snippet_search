import React, { useEffect, useState } from 'react';

export default function Report() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data/report')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setData(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading report data...</div>;

  return (
    <div className="space-y-6 overflow-x-auto">
      <h1 className="text-2xl font-semibold text-gray-900">Snippet Search Report</h1>
      <p className="text-sm text-gray-500">
        Advanced Master View with calculated balances, tier notes, and attorney assignments.
      </p>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
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
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{row.ClientName}</div>
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
                  <td className="px-4 py-4 text-gray-500 max-w-xs truncate" title={row.T_ClientCare_Notes}>
                    {row.T_ClientCare_Notes || 'None'}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-gray-500">No report data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
