"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button, TextInput, PasswordInput, Card, Text, Group, Alert, Divider, Center, Anchor } from "@mantine/core";
import { Hand, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      const result = await signIn('google', {
        callbackUrl: '/dashboard',
      });

      if (result?.error) {
        setError('Google sign-in failed. Please try again.');
      }
    } catch (error) {
      setError('Google sign-in error. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Center style={{ minHeight: '100vh', padding: '1rem' }}>
      <Card shadow="sm" padding="lg" radius="md" withBorder style={{ width: '100%', maxWidth: 400 }}>
        <Group justify="center" mb="md">
          <Hand size={48} color="var(--mantine-color-blue-6)" />
        </Group>
        <Text size="xl" fw={700} ta="center">Hands On Labor</Text>
        <Text c="dimmed" ta="center" mb="lg">
          Sign in to your Scheduling Portal
        </Text>

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email Address"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
            disabled={isLoading}
            mb="md"
          />
          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            disabled={isLoading}
            mb="md"
          />
          
          {error && (
            <Alert
              variant="light"
              color="red"
              title="Login Error"
              icon={<AlertCircle />}
              mb="md"
            >
              {error}
            </Alert>
          )}

          <Button type="submit" fullWidth loading={isLoading} disabled={isGoogleLoading}>
            Sign In
          </Button>
        </form>

        <Divider label="Or" labelPosition="center" my="lg" />

        <Button
          fullWidth
          variant="default"
          onClick={handleGoogleSignIn}
          loading={isGoogleLoading}
          disabled={isLoading}
          leftSection={
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          }
        >
          Sign In with Google
        </Button>
        <Button fullWidth variant="subtle" component={Link} href="/signup">
          Don't have an account? Sign up
        </Button>

        <Text ta="center" mt="md">
          Don't have an account?{' '}
          <Anchor component={Link} href="/signup">
            Sign up
          </Anchor>
        </Text>
      </Card>
    </Center>
  );
}
