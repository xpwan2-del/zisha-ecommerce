"use client";

import { useState, useEffect } from "react";

interface InventoryItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  low_stock_threshold: number;
  updated_at: string;
}

interface Transaction {
  id: number;
  product_id: number;
  product_name: string;
  transaction_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string;
  operator_name: string;
  created_at: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions'>('inventory');
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    change_type: 'increase',
    quantity: '',
    reason: ''
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products?limit=100');
      const data = await res.json();
      if (data.success) {
        const invData = data.data.products.map((p: any) => ({
          id: p.id,
          product_id: p.id,
          product_name: p.name,
          quantity: p.stock || 0,
          low_stock_threshold: 10,
          updated_at: p.updated_at
        }));
        setInventory(invData);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (productId?: number) => {
    try {
      setLoading(true);
      let url = '/api/inventory?limit=50';
      if (productId) {
        url += `&product_id=${productId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'inventory' | 'transactions') => {
    setActiveTab(tab);
    if (tab === 'transactions') {
      fetchTransactions(selectedProduct || undefined);
    }
  };

  const handleAdjustStock = async (productId: number) => {
    if (!adjustForm.quantity || !confirm('Confirm stock adjustment?')) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          change_type: adjustForm.change_type,
          quantity: parseInt(adjustForm.quantity),
          reason: adjustForm.reason || 'Manual adjustment',
          operator_name: 'admin'
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Stock adjusted successfully!');
        setAdjustForm({ change_type: 'increase', quantity: '', reason: '' });
        fetchInventory();
      } else {
        alert(data.error || 'Failed to adjust stock');
      }
    } catch (err) {
      alert('Failed to adjust stock');
    }
  };

  const getStockStatus = (quantity: number, threshold: number) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (quantity <= threshold) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const getTransactionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'init': 'Initialize',
      'increase': 'Stock In',
      'decrease': 'Stock Out',
      'sale': 'Sale',
      'cancel': 'Cancel',
      'return': 'Return',
      'adjust': 'Adjustment',
      'loss': 'Loss',
      'profit': 'Profit'
    };
    return types[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    if (type === 'sale' || type === 'cancel' || type === 'loss') return 'text-red-600';
    if (type === 'return' || type === 'profit' || type === 'init' || type === 'increase') return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] text-white py-6 px-6 rounded-lg mb-6">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <p className="text-white/80 mt-1">Manage product stock and view inventory transactions</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleTabChange('inventory')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'inventory'
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Inventory List
            </button>
            <button
              onClick={() => handleTabChange('transactions')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Transactions
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'inventory' ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Product Inventory</h2>
                <button
                  onClick={fetchInventory}
                  className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 text-sm"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Threshold</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No inventory data. Tables will be created during implementation.
                          </td>
                        </tr>
                      ) : (
                        inventory.map((item) => {
                          const status = getStockStatus(item.quantity, item.low_stock_threshold);
                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div className="font-medium">{item.product_name}</div>
                                <div className="text-xs text-gray-500">ID: {item.product_id}</div>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{item.low_stock_threshold}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <button
                                  onClick={() => {
                                    setSelectedProduct(item.product_id);
                                    setAdjustForm({ change_type: 'increase', quantity: '', reason: '' });
                                  }}
                                  className="text-[var(--accent)] hover:underline mr-3"
                                >
                                  Adjust
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-bold mb-4">Adjust Stock</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Operation</label>
                        <select
                          value={adjustForm.change_type}
                          onChange={(e) => setAdjustForm({ ...adjustForm, change_type: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="increase">Increase (Stock In)</option>
                          <option value="decrease">Decrease (Stock Out)</option>
                          <option value="set">Set (Absolute Value)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Quantity</label>
                        <input
                          type="number"
                          value={adjustForm.quantity}
                          onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Reason</label>
                        <input
                          type="text"
                          value={adjustForm.reason}
                          onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="Optional reason"
                        />
                      </div>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => setSelectedProduct(null)}
                          className="px-4 py-2 border rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAdjustStock(selectedProduct)}
                          className="px-4 py-2 bg-[var(--color-green)] text-white rounded-md hover:opacity-90"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Inventory Transactions</h2>
                <button
                  onClick={() => fetchTransactions(selectedProduct || undefined)}
                  className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 text-sm"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Before</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">After</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                            No transaction records found.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(tx.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{tx.product_name}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={getTransactionTypeColor(tx.transaction_type)}>
                                {getTransactionTypeLabel(tx.transaction_type)}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-sm font-semibold ${getTransactionTypeColor(tx.transaction_type)}`}>
                              {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
                            </td>
                            <td className="px-4 py-3 text-sm">{tx.quantity_before}</td>
                            <td className="px-4 py-3 text-sm">{tx.quantity_after}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{tx.reason || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{tx.operator_name || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
