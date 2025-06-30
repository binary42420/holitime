'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-mobile-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Smartphone, Wifi, WifiOff } from 'lucide-react';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const { user, loading, login, logout, isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      await login(loginForm.email, loginForm.password);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoginLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Holitime Mobile...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Smartphone className="h-8 w-8 text-blue-600 mr-2" />
              <CardTitle className="text-2xl">Holitime Mobile</CardTitle>
            </div>
            <div className="flex items-center justify-center text-sm text-gray-600">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 mr-1 text-green-600" />
                  Connected to API
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 mr-1 text-red-600" />
                  Offline
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={!isOnline}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                  disabled={!isOnline}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginLoading || !isOnline}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            
            {!isOnline && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  You're currently offline. Please check your internet connection.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main app layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Smartphone className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-lg font-semibold">Holitime</h1>
          </div>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-gray-600"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Connection status banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-sm text-center">
          You're offline. Some features may not be available.
        </div>
      )}

      {/* Main content */}
      <main className="pb-16">
        {children}
      </main>

      {/* Mobile footer with user info */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Welcome, {user?.name || user?.email}</span>
          <span className="text-xs">
            API: {process.env.NEXT_PUBLIC_API_URL?.replace('https://', '')}
          </span>
        </div>
      </footer>
    </div>
  );
}
