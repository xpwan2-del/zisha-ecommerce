"use client";

import { useState, useEffect } from 'react';
import AddressCard from './AddressCard';
import AddressForm from './AddressForm';

interface Address {
  id: number;
  contact_name: string;
  phone: string;
  country_code: string | null;
  country_name: string;
  state_code: string | null;
  state_name: string | null;
  city: string;
  street_address: string;
  street_address_2?: string;
  postal_code?: string;
  label?: string;
  is_default: boolean;
  formatted_address?: string;
}

export default function AddressList() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/addresses', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }

      const result = await response.json();
      if (result.success) {
        setAddresses(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch addresses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    setShowForm(true);
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  const handleSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);

      const isUpdate = !!editingAddress?.id;
      const method = isUpdate ? 'PUT' : 'POST';
      const url = isUpdate ? '/api/addresses' : '/api/addresses';
      const body = isUpdate
        ? { ...formData, id: editingAddress.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isUpdate ? 'update' : 'create'} address`);
      }

      const result = await response.json();

      if (result.success) {
        await fetchAddresses();
        handleCancel();
      } else {
        throw new Error(result.error || `Failed to ${isUpdate ? 'update' : 'create'} address`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个地址吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/addresses?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete address');
      }

      const result = await response.json();

      if (result.success) {
        await fetchAddresses();
      } else {
        throw new Error(result.error || 'Failed to delete address');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const response = await fetch('/api/addresses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ id, is_default: true })
      });

      if (!response.ok) {
        throw new Error('Failed to set default address');
      }

      const result = await response.json();

      if (result.success) {
        await fetchAddresses();
      } else {
        throw new Error(result.error || 'Failed to set default address');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchAddresses}
          className="px-4 py-2 text-white bg-accent rounded-md hover:bg-accent/90"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div>
      {showForm ? (
        <div className="p-6 bg-card rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-text mb-4">
            {editingAddress ? '编辑地址' : '添加新地址'}
          </h3>
          <AddressForm
            address={editingAddress}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
          />
        </div>
      ) : (
        <>
          {addresses.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-text-muted mb-4">暂无地址</p>
              <button
                onClick={handleAddNew}
                className="px-4 py-2 text-white bg-accent rounded-md hover:bg-accent/90"
              >
                添加第一个地址
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="p-4 bg-card rounded-lg border border-border hover:border-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-text">{address.contact_name}</span>
                        <span className="text-text-muted text-sm">{address.phone}</span>
                        {address.is_default && (
                          <span className="text-xs px-2 py-0.5 rounded bg-accent text-white">默认</span>
                        )}
                      </div>
                      <p className="text-sm text-text-muted truncate">
                        {[address.state_name, address.city, address.street_address].filter(Boolean).join(' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!address.is_default && (
                        <button
                          onClick={() => handleSetDefault(address.id)}
                          className="px-3 py-1 text-xs text-accent hover:bg-accent/10 rounded transition-colors"
                        >
                          设为默认
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(address)}
                        className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(address.id)}
                        className="px-3 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddNew}
                className="w-full px-4 py-3 text-accent bg-card border-2 border-dashed border-accent rounded-lg hover:bg-accent/5 transition-colors text-center"
              >
                + 添加新地址
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
