"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAboutPage() {
  const router = useRouter();
  const [about, setAbout] = useState({
    title: '',
    description: '',
    images: [] as string[],
    videoUrl: '',
    content: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAbout();
  }, []);

  const fetchAbout = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/about');
      const data = await response.json();
      setAbout(data);
    } catch (error) {
      console.error('Error fetching about:', error);
      setError('Failed to load about information');
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
      
      const response = await fetch('/api/about', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(about)
      });
      
      if (response.ok) {
        setSuccess('About information updated successfully');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to update about information');
      }
    } catch (error) {
      console.error('Error updating about:', error);
      setError('Failed to update about information');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...about.images];
    newImages[index] = value;
    setAbout({ ...about, images: newImages });
  };

  const addImage = () => {
    setAbout({ ...about, images: [...about.images, ''] });
  };

  const removeImage = (index: number) => {
    const newImages = about.images.filter((_, i) => i !== index);
    setAbout({ ...about, images: newImages });
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
          <h1 className="text-3xl font-bold">Edit About Information</h1>
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
              value={about.title}
              onChange={(e) => setAbout({ ...about, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block mb-2 font-medium">Description</label>
            <input
              type="text"
              id="description"
              value={about.description}
              onChange={(e) => setAbout({ ...about, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Images</label>
            <div className="space-y-4">
              {about.images.map((image, index) => (
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
              value={about.videoUrl}
              onChange={(e) => setAbout({ ...about, videoUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="YouTube embed URL"
            />
          </div>

          <div>
            <label htmlFor="content" className="block mb-2 font-medium">Content</label>
            <textarea
              id="content"
              value={about.content}
              onChange={(e) => setAbout({ ...about, content: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={8}
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
