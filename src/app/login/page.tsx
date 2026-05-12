"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
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
      </div>
    </div>
  );
}