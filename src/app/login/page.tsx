"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Load saved email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    console.log('========== [Login Page] ==========');
    console.log('1. Loading saved email from localStorage:', savedEmail);
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
      console.log('2. Email loaded successfully:', savedEmail);
    } else {
      console.log('2. No saved email found in localStorage');
    }
    console.log('========== [Login Page END] ==========');
  }, []);
  
  // Always redirect to account page after login
  const redirectUrl = '/account';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      console.log('========== [Login Page] ==========');
      console.log('1. Attempting login with email:', formData.email);
      console.log('2. Remember me:', rememberMe);
      console.log('3. Redirect URL after login:', redirectUrl);
      
      await login(formData.email, formData.password);
      
      // Save email to localStorage if remember me is checked
      if (rememberMe) {
        localStorage.setItem('remembered_email', formData.email);
        console.log('4. Email saved to localStorage for remember me');
      } else {
        localStorage.removeItem('remembered_email');
        console.log('4. Remember me not checked, email removed from localStorage');
      }
      
      console.log('5. Login successful, redirecting to:', redirectUrl);
      console.log('========== [Login Page END - SUCCESS] ==========');
      
      router.push(redirectUrl);
    } catch (err) {
      console.error('========== [Login Page ERROR] ==========');
      console.error('Login failed:', err);
      console.error('========== [Login Page ERROR END] ==========');
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background middle-east-pattern py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold font-['Noto_Naskh_Arabic'] text-text">
            {t('login.title')}
          </h2>
          <p className="mt-2 text-sm font-['Noto_Sans_Arabic'] text-text-muted">
            {t('login.subtitle')}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-accent/10 border border-accent/30 text-accent p-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium font-['Noto_Sans_Arabic'] text-text">
                {t('login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-accent/30 bg-white/90 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium font-['Noto_Sans_Arabic'] text-text">
                {t('login.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-accent/30 bg-white/90 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-accent focus:ring-accent border-accent/30 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm font-['Noto_Sans_Arabic'] text-text-muted">
                {t('login.remember')}
              </label>
            </div>
            
            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-accent hover:text-accent"
              >
                {t('login.forgot_password')}
              </a>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 font-['Noto_Sans_Arabic']"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                t('login.sign_in')
              )}
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-sm font-['Noto_Sans_Arabic'] text-text-muted">
              {t('login.no_account')}{' '}
              <a
                href="/register"
                className="font-medium text-accent hover:text-accent"
              >
                {t('login.sign_up')}
              </a>
            </p>
          </div>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-accent/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-background text-text-muted font-['Noto_Sans_Arabic']">
              {t('login.or')}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            className="inline-flex justify-center py-2 px-4 border border-accent/30 rounded-md shadow-sm bg-white/90 text-sm font-medium text-text hover:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <span className="sr-only">Sign in with Google</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </button>
          
          <button
            type="button"
            className="inline-flex justify-center py-2 px-4 border border-accent/30 rounded-md shadow-sm bg-white/90 text-sm font-medium text-text hover:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <span className="sr-only">Sign in with Apple</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm4.41 15.59c-.78.78-2.05.78-2.83 0l-3.54-3.54c-.39-.39-.39-1.02 0-1.41s1.02-.39 1.41 0l2.83 2.83 6.3-6.3c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41l-7.01 7.01z" />
            </svg>
          </button>
          
          <button
            type="button"
            className="inline-flex justify-center py-2 px-4 border border-accent/30 rounded-md shadow-sm bg-white/90 text-sm font-medium text-text hover:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <span className="sr-only">Sign in with Facebook</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}