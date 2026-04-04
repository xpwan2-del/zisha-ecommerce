"use client";

import { useState, useEffect } from 'react';

export default function LogoSettingsPage() {
  const [logoUrl, setLogoUrl] = useState('');
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/system-configs?key=logo_url')
      .then(res => res.json())
      .then(data => {
        if (data?.config_value) {
          setLogoUrl(data.config_value);
          setPreview(data.config_value);
        }
      });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setLogoUrl(data.url);
        setPreview(data.url);
        setMessage('Logo uploaded successfully');
      } else {
        setMessage('Upload failed');
      }
    } catch (error) {
      setMessage('Upload failed');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/system-configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config_key: 'logo_url',
          config_value: logoUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Logo saved successfully');
      } else {
        setMessage('Failed to save');
      }
    } catch (error) {
      setMessage('Failed to save');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Logo Settings</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Logo
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center min-h-[150px]">
            {preview ? (
              <img src={preview} alt="Logo Preview" className="max-h-32 object-contain" />
            ) : (
              <span className="text-gray-400">No logo set</span>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload New Logo
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-amazon-orange file:text-white hover:file:bg-orange-600"
          />
          {uploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo URL
          </label>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => {
              setLogoUrl(e.target.value);
              setPreview(e.target.value);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="/uploads/logo_xxx.png"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!logoUrl}
          className="bg-amazon-orange text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
        >
          Save Logo
        </button>

        {message && (
          <p className={`mt-4 text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}