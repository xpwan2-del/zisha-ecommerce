"use client";

import { useState, useEffect } from "react";

interface Alert {
  id: number;
  product_id: number;
  product_name: string;
  alert_type: string;
  current_stock: number;
  threshold: number;
  old_status: string;
  new_status: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_note: string;
  created_at: string;
}

export default function InventoryAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db/table/inventory_alerts');
      const data = await res.json();
      if (data.success) {
        let filteredAlerts = data.data.rows || [];
        if (filter === 'pending') {
          filteredAlerts = filteredAlerts.filter((a: any) => !a.is_resolved);
        } else if (filter === 'resolved') {
          filteredAlerts = filteredAlerts.filter((a: any) => a.is_resolved);
        }
        setAlerts(filteredAlerts);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'low_stock': 'Low Stock',
      'out_of_stock': 'Out of Stock',
      'overstock': 'Overstock'
    };
    return types[type] || type;
  };

  const getAlertTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'low_stock': 'bg-yellow-100 text-yellow-800',
      'out_of_stock': 'bg-red-100 text-red-800',
      'overstock': 'bg-blue-100 text-blue-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-6 px-6 rounded-lg mb-6">
        <h1 className="text-2xl font-bold">Inventory Alerts</h1>
        <p className="text-white/80 mt-1">Monitor and manage low stock warnings</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'pending'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'resolved'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Resolved
            </button>
          </div>
          <button
            onClick={fetchAlerts}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 text-sm"
          >
            Refresh
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No alerts found.
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 ${
                    alert.is_resolved ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getAlertTypeColor(alert.alert_type)}`}>
                        {getAlertTypeLabel(alert.alert_type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{alert.product_name || `Product #${alert.product_id}`}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Current Stock: <span className="font-semibold">{alert.current_stock}</span>
                          {alert.threshold && ` | Threshold: ${alert.threshold}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Created: {new Date(alert.created_at).toLocaleString()}
                        </p>
                        {alert.is_resolved && alert.resolved_at && (
                          <p className="text-xs text-green-600 mt-1">
                            Resolved: {new Date(alert.resolved_at).toLocaleString()}
                          </p>
                        )}
                        {alert.resolution_note && (
                          <p className="text-xs text-gray-500 mt-1">
                            Note: {alert.resolution_note}
                          </p>
                        )}
                      </div>
                    </div>
                    {!alert.is_resolved && (
                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setResolveNote('');
                        }}
                        className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Resolve Alert</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Product: {selectedAlert.product_name || `Product #${selectedAlert.product_id}`}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Current Stock: {selectedAlert.current_stock}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Resolution Note</label>
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Enter resolution note (e.g., Restocked, Adjusted threshold)"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/db/table/inventory_alerts/${selectedAlert.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        is_resolved: 1,
                        resolved_at: new Date().toISOString(),
                        resolution_note: resolveNote
                      })
                    });
                    if (res.ok) {
                      alert('Alert resolved!');
                      setSelectedAlert(null);
                      fetchAlerts();
                    }
                  } catch (err) {
                    alert('Failed to resolve alert');
                  }
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
