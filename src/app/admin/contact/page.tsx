"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminContactPage() {
  const router = useRouter();
  const [contact, setContact] = useState({
    title: '',
    description: '',
    images: [] as string[],
    videoUrl: '',
    address: '',
    email: '',
    phone: '',
    openingHours: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchContact();
  }, []);

  const fetchContact = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/contact');
      const data = await response.json();
      setContact(data);
    } catch (error) {
      console.error('Error fetching contact:', error);
      setError('Failed to load contact information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contact)
      });
      
      if (response.ok) {
        setSuccess('Contact information updated successfully');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to update contact information');
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      setError('Failed to update contact information');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...contact.images];
    newImages[index] = value;
    setContact({ ...contact, images: newImages });
  };

  const addImage = () => {
    setContact({ ...contact, images: [...contact.images, ''] });
  };

  const removeImage = (index: number) => {
    const newImages = contact.images.filter((_, i) => i !== index);
    setContact({ ...contact, images: newImages });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Edit Contact Information</h1>
          <button 
            onClick={() => router.push('/admin/dashboard')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-all duration-300"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block mb-2 font-medium">Title</label>
            <input
              type="text"
              id="title"
              value={contact.title}
              onChange={(e) => setContact({ ...contact, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block mb-2 font-medium">Description</label>
            <input
              type="text"
              id="description"
              value={contact.description}
              onChange={(e) => setContact({ ...contact, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Images</label>
            <div className="space-y-4">
              {contact.images.map((image, index) => (
                <div key={index} className="flex items-center gap-4">
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => handleImageChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Image URL"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addImage}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-all duration-300"
              >
                Add Image
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="videoUrl" className="block mb-2 font-medium">Video URL</label>
            <input
              type="text"
              id="videoUrl"
              value={contact.videoUrl}
              onChange={(e) => setContact({ ...contact, videoUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="YouTube embed URL"
            />
          </div>

          <div>
            <label htmlFor="address" className="block mb-2 font-medium">Address</label>
            <input
              type="text"
              id="address"
              value={contact.address}
              onChange={(e) => setContact({ ...contact, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block mb-2 font-medium">Email</label>
            <input
              type="email"
              id="email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block mb-2 font-medium">Phone</label>
            <input
              type="text"
              id="phone"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="openingHours" className="block mb-2 font-medium">Opening Hours</label>
            <textarea
              id="openingHours"
              value={contact.openingHours}
              onChange={(e) => setContact({ ...contact, openingHours: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
              required
            ></textarea>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
