"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  const referralCode = searchParams.get('ref');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // 使用 AuthContext 中的 register 函数
      await register(formData.name, formData.email, formData.password);
      
      setSuccess('Registration successful! Redirecting to your account...');
      setTimeout(() => {
        router.push('/account');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-text">
            {t('register.title')}
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            {t('register.subtitle')}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-accent/10 border border-accent/30 text-accent p-3 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-accent/10 border border-accent/30 text-accent p-3 rounded-lg">
              {success}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text">
                {t('register.name')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-border bg-white/90 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text">
                {t('register.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-border bg-white/90 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-text">
                {t('register.phone')}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-border bg-white/90 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text">
                {t('register.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-border bg-white/90 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text">
                {t('register.confirm_password')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-border bg-white/90 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
              />
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-accent focus:ring-accent border-border rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-text">
              {t('register.terms')}
            </label>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                t('register.sign_up')
              )}
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-text-muted">
              {t('register.have_account')}{' '}
              <a
                href="/login"
                className="font-medium text-accent hover:text-accent"
              >
                {t('register.sign_in')}
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}