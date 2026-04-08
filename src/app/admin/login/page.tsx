"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mock authentication for demo purposes
    if (email === 'admin@zishapottery.com' && password === 'admin123') {
      // Store admin token in localStorage
      localStorage.setItem('adminToken', 'mock-admin-token');
      router.push('/admin/dashboard');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF2F8] middle-east-pattern">
      <div className="w-full max-w-md p-8 glass-effect rounded-lg shadow-lg border border-[#DB2777]/20">
        <h1 className="text-3xl font-bold text-center mb-8 font-['Noto_Naskh_Arabic'] text-[#831843]">Admin Login</h1>
        {error && (
          <div className="mb-4 p-3 bg-[#DB2777]/20 text-[#DB2777] rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-2 font-medium font-['Noto_Sans_Arabic'] text-[#831843]">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-[#DB2777]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CA8A04] font-['Noto_Sans_Arabic'] text-[#831843]"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-2 font-medium font-['Noto_Sans_Arabic'] text-[#831843]">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-[#DB2777]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CA8A04] font-['Noto_Sans_Arabic'] text-[#831843]"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#CA8A04] hover:bg-[#B47C03] text-white py-3 rounded-lg font-['Noto_Sans_Arabic'] font-medium transition-all duration-300"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}