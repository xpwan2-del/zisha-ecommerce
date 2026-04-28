"use client";

import { useState, useEffect } from 'react';
import CountrySelect from './CountrySelect';
import RegionSelect from './RegionSelect';

interface Address {
  id?: number;
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
  is_default?: boolean;
}

interface AddressFormProps {
  address?: Address | null;
  onSubmit: (address: Address) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const LABEL_OPTIONS = [
  { value: '', label: '无标签' },
  { value: '家', label: '家' },
  { value: '公司', label: '公司' },
  { value: '办公室', label: '办公室' },
  { value: '其他', label: '其他' }
];

export default function AddressForm({ address, onSubmit, onCancel, isLoading = false }: AddressFormProps) {
  const [formData, setFormData] = useState<Address>({
    contact_name: '',
    phone: '',
    country_code: '',
    country_name: '',
    state_code: null,
    state_name: null,
    city: '',
    street_address: '',
    street_address_2: '',
    postal_code: '',
    label: '',
    is_default: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (address) {
      setFormData({
        id: address.id,
        contact_name: address.contact_name || '',
        phone: address.phone || '',
        country_code: address.country_code || '',
        country_name: address.country_name || '',
        state_code: address.state_code || null,
        state_name: address.state_name || null,
        city: address.city || '',
        street_address: address.street_address || '',
        street_address_2: address.street_address_2 || '',
        postal_code: address.postal_code || '',
        label: address.label || '',
        is_default: address.is_default || false
      });
    }
  }, [address]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.contact_name.trim()) {
      newErrors.contact_name = '请输入联系人姓名';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '请输入电话号码';
    } else if (!/^[+]?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = '请输入有效的电话号码';
    }

    if (!formData.country_name) {
      newErrors.country = '请选择国家';
    }

    if (!formData.city.trim()) {
      newErrors.city = '请输入城市';
    }

    if (!formData.street_address.trim()) {
      newErrors.street_address = '请输入街道地址';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleCountryChange = (countryName: string) => {
    setFormData(prev => ({
      ...prev,
      country_name: countryName,
      state_name: null,
      state_code: null
    }));
  };

  const handleRegionChange = (regionName: string) => {
    setFormData(prev => ({
      ...prev,
      state_name: regionName
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-text mb-1">
            地址标签 <span className="text-text-muted">(可选)</span>
          </label>
          <select
            value={formData.label || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
            className="w-full px-4 py-2 bg-card border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {LABEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-text mb-1">
            联系人姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.contact_name}
            onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
            placeholder="张三"
            className="w-full px-4 py-2 bg-card border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {errors.contact_name && (
            <p className="mt-1 text-sm text-red-500">{errors.contact_name}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-text mb-1">
            电话 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+971 50 123 4567"
            className="w-full px-4 py-2 bg-card border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-text mb-1">
            国家 <span className="text-red-500">*</span>
          </label>
          <CountrySelect
            value={formData.country_name}
            onChange={handleCountryChange}
          />
          {errors.country && (
            <p className="mt-1 text-sm text-red-500">{errors.country}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-text mb-1">
            地区/酋长国
          </label>
          <RegionSelect
            country={formData.country_name}
            value={formData.state_name || ''}
            onChange={handleRegionChange}
            placeholder={formData.country_name ? '选择地区' : '请先选择国家'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1">
            城市 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            placeholder="Dubai"
            className="w-full px-4 py-2 bg-card border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-500">{errors.city}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1">
            邮编 <span className="text-text-muted">(可选)</span>
          </label>
          <input
            type="text"
            value={formData.postal_code}
            onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
            placeholder="12345"
            className="w-full px-4 py-2 bg-card border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-text mb-1">
            街道地址 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.street_address}
            onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
            placeholder="Sheikh Zayed Road, 123 Building"
            className="w-full px-4 py-2 bg-card border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {errors.street_address && (
            <p className="mt-1 text-sm text-red-500">{errors.street_address}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-text mb-1">
            街道地址 2 <span className="text-text-muted">(可选)</span>
          </label>
          <input
            type="text"
            value={formData.street_address_2}
            onChange={(e) => setFormData(prev => ({ ...prev, street_address_2: e.target.value }))}
            placeholder="Floor 25, Unit 2501"
            className="w-full px-4 py-2 bg-card border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
              className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
            />
            <span className="text-sm text-text">设为默认地址</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2 text-text bg-background hover:bg-background-alt rounded-md transition-colors disabled:opacity-50"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 text-white bg-accent hover:bg-accent/90 rounded-md transition-colors disabled:opacity-50"
        >
          {isLoading ? '保存中...' : '保存地址'}
        </button>
      </div>
    </form>
  );
}
