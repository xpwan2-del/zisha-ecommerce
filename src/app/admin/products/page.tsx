"use client";

import { useState, useEffect } from 'react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`/api/products?id=${id}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          throw new Error('Failed to delete product');
        }
        setProducts(products.filter(product => product.id !== id));
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
      }
    }
  };

  const handleExport = () => {
    window.location.href = '/api/products?action=export';
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/products', {
      method: 'POST',
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert(data.message);
          fetchProducts();
        } else {
          alert('Import failed: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Error importing products:', error);
        alert('Failed to import products');
      });

    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="py-8 px-4 bg-[#FDF2F8] middle-east-pattern min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold font-['Noto_Naskh_Arabic'] text-[#831843]">Products</h1>
          <div className="flex space-x-4">
            <button 
              onClick={handleExport}
              className="bg-[#CA8A04] hover:bg-[#B47C03] text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 font-['Noto_Sans_Arabic']"
            >
              Export Products
            </button>
            <label className="bg-[#DB2777] hover:bg-[#BE185D] text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 cursor-pointer font-['Noto_Sans_Arabic']">
              Import Products
              <input 
                type="file" 
                accept=".csv" 
                className="hidden"
                onChange={handleImport}
              />
            </label>
            <button className="bg-[#CA8A04] hover:bg-[#B47C03] text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 font-['Noto_Sans_Arabic']">
              Add Product
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-64 glass-effect rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CA8A04]"></div>
          </div>
        ) : (
          <div className="glass-effect rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-white/80">
                    <th className="text-left py-3 px-4 font-['Noto_Naskh_Arabic'] text-[#831843]">Image</th>
                    <th className="text-left py-3 px-4 font-['Noto_Naskh_Arabic'] text-[#831843]">Name</th>
                    <th className="text-left py-3 px-4 font-['Noto_Naskh_Arabic'] text-[#831843]">Category</th>
                    <th className="text-left py-3 px-4 font-['Noto_Naskh_Arabic'] text-[#831843]">Price</th>
                    <th className="text-left py-3 px-4 font-['Noto_Naskh_Arabic'] text-[#831843]">Stock</th>
                    <th className="text-left py-3 px-4 font-['Noto_Naskh_Arabic'] text-[#831843]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-[#DB2777]/20 hover:bg-white/50 transition-colors">
                      <td className="py-3 px-4">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-12 h-12 object-cover rounded"
                        />
                      </td>
                      <td className="py-3 px-4 font-['Noto_Sans_Arabic'] text-[#831843]">{product.name}</td>
                      <td className="py-3 px-4 font-['Noto_Sans_Arabic'] text-[#831843]">{product.category_id}</td>
                      <td className="py-3 px-4 font-['Noto_Sans_Arabic'] text-[#831843]">¥{Number(product.price).toFixed(2)}</td>
                      <td className="py-3 px-4 font-['Noto_Sans_Arabic'] text-[#831843]">{product.stock}</td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <a href={`/admin/products/${product.id}/edit`} className="bg-[#CA8A04] hover:bg-[#B47C03] text-white px-3 py-1 rounded-md text-sm font-['Noto_Sans_Arabic']">
                            Edit
                          </a>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="bg-[#DB2777] hover:bg-[#BE185D] text-white px-3 py-1 rounded-md text-sm font-['Noto_Sans_Arabic']"
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
    </div>
  );
}