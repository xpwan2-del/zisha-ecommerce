"use client";

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  priority: number;
}

interface CategoryFormData {
  name: string;
  description: string;
  image: string;
  priority: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    image: '',
    priority: 0,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        setCategories([
          {
            id: '1',
            name: "Teapots",
            description: "Zisha teapots of various sizes and designs",
            image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapots%20collection&image_size=square",
            priority: 0,
          },
          {
            id: '2',
            name: "Cups",
            description: "Zisha tea cups and sets",
            image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups&image_size=square",
            priority: 1,
          },
          {
            id: '3',
            name: "Accessories",
            description: "Tea accessories and tools",
            image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tea%20accessories&image_size=square",
            priority: 2,
          },
          {
            id: '4',
            name: "Sets",
            description: "Complete tea sets with teapot and cups",
            image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20set&image_size=square",
            priority: 3,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setIsEditing(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      image: '',
      priority: 0,
    });
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    setIsEditing(true);
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      image: category.image,
      priority: category.priority,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setCategories(categories.filter(category => category.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && editingCategory) {
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, ...formData }
          : cat
      ));
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        ...formData,
      };
      setCategories([...categories, newCategory]);
    }
    
    setShowModal(false);
    setFormData({
      name: '',
      description: '',
      image: '',
      priority: 0,
    });
  };

  const sortedCategories = [...categories].sort((a, b) => a.priority - b.priority);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Categories</h1>
        <button 
          onClick={handleAdd}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300"
        >
          Add Category
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">
              {isEditing ? 'Edit Category' : 'Add Category'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Image URL</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Priority (0 = highest)</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Lower numbers appear first (0 = highest priority)</p>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-300"
                >
                  {isEditing ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="text-left py-3 px-4">Priority</th>
                  <th className="text-left py-3 px-4">Image</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((category) => (
                  <tr key={category.id} className="border-b">
                    <td className="py-3 px-4">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">
                        {category.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <img 
                        src={category.image} 
                        alt={category.name} 
                        className="w-12 h-12 object-cover rounded"
                      />
                    </td>
                    <td className="py-3 px-4">{category.name}</td>
                    <td className="py-3 px-4">{category.description}</td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEdit(category)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-all duration-300"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(category.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-all duration-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
