"use client";

import { useState, useEffect } from "react";

interface CheckItem {
  id: number;
  check_id: number;
  product_id: number;
  product_name: string;
  system_quantity: number;
  actual_quantity: number | null;
  difference: number | null;
  difference_type: string | null;
  status: string;
}

interface Check {
  id: number;
  check_number: string;
  status: string;
  total_products: number;
  profit_count: number;
  loss_count: number;
  profit_quantity: number;
  loss_quantity: number;
  operator_name: string;
  completed_at: string | null;
  created_at: string;
}

export default function InventoryChecksPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [currentCheck, setCurrentCheck] = useState<Check | null>(null);
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  useEffect(() => {
    fetchChecks();
  }, []);

  useEffect(() => {
    if (activeTab === 'create') {
      fetchProducts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentCheck) {
      fetchCheckItems(currentCheck.id);
    }
  }, [currentCheck]);

  const fetchChecks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db/table/inventory_checks?limit=50');
      const data = await res.json();
      if (data.success) {
        setChecks(data.data.rows || []);
      }
    } catch (err) {
      console.error('Failed to fetch checks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckItems = async (checkId: number) => {
    try {
      const res = await fetch(`/api/db/table/inventory_check_items?check_id=${checkId}&limit=100`);
      const data = await res.json();
      if (data.success) {
        setCheckItems(data.data.rows || []);
      }
    } catch (err) {
      console.error('Failed to fetch check items:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const createCheck = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select at least one product to check');
      return;
    }

    const checkNumber = `CHK${Date.now()}`;
    try {
      const res = await fetch('/api/db/table/inventory_checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_number: checkNumber,
          status: 'pending',
          total_products: selectedProducts.length,
          profit_count: 0,
          loss_count: 0,
          profit_quantity: 0,
          loss_quantity: 0,
          operator_name: 'admin'
        })
      });

      if (res.ok) {
        const result = await res.json();
        const checkId = result.data?.id || result.id;

        for (const productId of selectedProducts) {
          const product = products.find(p => p.id === productId);
          await fetch('/api/db/table/inventory_check_items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              check_id: checkId,
              product_id: productId,
              product_name: product?.name || `Product #${productId}`,
              system_quantity: product?.stock || 0,
              actual_quantity: null,
              difference: null,
              difference_type: null,
              status: 'pending'
            })
          });
        }

        alert('Check created successfully!');
        setSelectedProducts([]);
        setActiveTab('list');
        fetchChecks();
      }
    } catch (err) {
      alert('Failed to create check');
    }
  };

  const updateActualQuantity = async (itemId: number, actualQty: number, systemQty: number) => {
    const difference = actualQty - systemQty;
    let differenceType = 'ok';
    if (difference > 0) differenceType = 'profit';
    else if (difference < 0) differenceType = 'loss';

    try {
      await fetch(`/api/db/table/inventory_check_items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_quantity: actualQty,
          difference: difference,
          difference_type: differenceType,
          status: 'confirmed'
        })
      });

      setCheckItems(items =>
        items.map(item =>
          item.id === itemId
            ? { ...item, actual_quantity: actualQty, difference, difference_type: differenceType, status: 'confirmed' }
            : item
        )
      );
    } catch (err) {
      alert('Failed to update quantity');
    }
  };

  const completeCheck = async () => {
    if (!currentCheck) return;

    const pendingItems = checkItems.filter(item => item.actual_quantity === null);
    if (pendingItems.length > 0) {
      alert(`Please enter actual quantity for all products. ${pendingItems.length} remaining.`);
      return;
    }

    const profitItems = checkItems.filter(item => item.difference_type === 'profit');
    const lossItems = checkItems.filter(item => item.difference_type === 'loss');
    const totalProfit = profitItems.reduce((sum, item) => sum + (item.difference || 0), 0);
    const totalLoss = Math.abs(lossItems.reduce((sum, item) => sum + (item.difference || 0), 0));

    try {
      await fetch(`/api/db/table/inventory_checks/${currentCheck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          profit_count: profitItems.length,
          loss_count: lossItems.length,
          profit_quantity: totalProfit,
          loss_quantity: totalLoss,
          completed_at: new Date().toISOString()
        })
      });

      for (const item of checkItems) {
        if (item.difference !== 0 && item.difference !== null) {
          const transactionType = item.difference > 0 ? 'profit' : 'loss';
          await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: item.product_id,
              change_type: transactionType,
              quantity: Math.abs(item.difference),
              reason: `Stock check adjustment: ${item.difference > 0 ? 'profit' : 'loss'}`,
              operator_name: 'admin'
            })
          });
        }

        await fetch(`/api/db/table/inventory_check_items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'adjusted'
          })
        });
      }

      alert('Check completed and inventory adjusted!');
      setCurrentCheck(null);
      setActiveTab('list');
      fetchChecks();
    } catch (err) {
      alert('Failed to complete check');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getDifferenceTypeColor = (type: string | null) => {
    if (type === 'profit') return 'text-green-600 bg-green-50';
    if (type === 'loss') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white py-6 px-6 rounded-lg mb-6">
        <h1 className="text-2xl font-bold">Stock Checks (盘点管理)</h1>
        <p className="text-white/80 mt-1">Perform inventory reconciliation and adjustments</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('list'); setCurrentCheck(null); }}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'list'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Check List
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'create'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              + New Check
            </button>
          </div>
          {activeTab === 'list' && (
            <button
              onClick={fetchChecks}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 text-sm"
            >
              Refresh
            </button>
          )}
        </div>

        <div className="p-6">
          {activeTab === 'list' ? (
            <div>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : checks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No stock checks found.
                </div>
              ) : (
                <div className="space-y-4">
                  {checks.map((check) => (
                    <div key={check.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{check.check_number}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(check.status)}`}>
                              {getStatusLabel(check.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Products: {check.total_products} |
                            Profit: <span className="text-green-600">{check.profit_count} ({check.profit_quantity})</span> |
                            Loss: <span className="text-red-600">{check.loss_count} ({check.loss_quantity})</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Created: {new Date(check.created_at).toLocaleString()}
                            {check.completed_at && ` | Completed: ${new Date(check.completed_at).toLocaleString()}`}
                          </p>
                        </div>
                        {check.status !== 'completed' && check.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              setCurrentCheck(check);
                              setActiveTab('detail');
                            }}
                            className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 text-sm"
                          >
                            Continue
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'create' ? (
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Products to Check</h2>
              <p className="text-sm text-gray-500 mb-4">Check the products you want to include in this inventory check.</p>

              <div className="mb-4">
                <button
                  onClick={() => setSelectedProducts(products.map(p => p.id))}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm mr-2"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedProducts([])}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  Deselect All
                </button>
                <span className="ml-4 text-sm text-gray-500">
                  Selected: {selectedProducts.length} products
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts([...selectedProducts, product.id]);
                        } else {
                          setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">{product.name}</span>
                    <span className="text-sm text-gray-500">Current Stock: {product.stock || 0}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createCheck}
                  className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90"
                >
                  Create Check ({selectedProducts.length} products)
                </button>
              </div>
            </div>
          ) : (
            <div>
              {currentCheck && (
                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold">Check: {currentCheck.check_number}</h2>
                      <p className="text-sm text-gray-500">
                        Status: <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(currentCheck.status)}`}>{getStatusLabel(currentCheck.status)}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setCurrentCheck(null); setActiveTab('list'); }}
                        className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm"
                      >
                        Back
                      </button>
                      {currentCheck.status !== 'completed' && (
                        <button
                          onClick={completeCheck}
                          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                        >
                          Complete Check & Adjust Inventory
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">System Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {checkItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{item.product_name}</td>
                        <td className="px-4 py-3 text-sm">{item.system_quantity}</td>
                        <td className="px-4 py-3 text-sm">
                          {item.actual_quantity !== null ? (
                            item.actual_quantity
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.difference !== null ? (
                            <span className={`px-2 py-1 text-xs rounded ${getDifferenceTypeColor(item.difference_type)}`}>
                              {item.difference > 0 ? '+' : ''}{item.difference}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.status === 'adjusted' ? 'bg-green-100 text-green-800' :
                            item.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.status === 'pending' && (
                            <input
                              type="number"
                              min="0"
                              placeholder="Enter"
                              className="w-20 px-2 py-1 border rounded text-sm"
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                  updateActualQuantity(item.id, val, item.system_quantity);
                                }
                              }}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
