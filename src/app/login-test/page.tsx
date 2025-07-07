"use client"

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button, TextInput, PasswordInput, Card, Text, Group, Alert, Center } from "@mantine/core";
import { AlertCircle } from "lucide-react";

export default function LoginTestPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
        window.location.href = '/dashboard';
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Center style={{ minHeight: '100vh', padding: '1rem' }}>
      <Card shadow="sm" padding="lg" radius="md" withBorder style={{ width: '100%', maxWidth: 400 }}>
        <Text size="xl" fw={700} ta="center">Login Test</Text>
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

          <Button type="submit" fullWidth loading={isLoading}>
            Sign In
          </Button>
        </form>
      </Card>
    </Center>
  );
}
