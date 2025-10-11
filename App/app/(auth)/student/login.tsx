import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { Button } from '@/components/ui/button';
import { Link } from 'expo-router';
import { DemoCredentials } from '@/components/auth/demo-credentials';
import { useAuthStore } from '@/src/store/auth.store';
import { config } from '@/src/config';

export default function StudentLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert(
          'Missing Information',
          'Please enter both email and password'
        );
        return;
      }

      setIsLoading(true);
      console.log('Attempting login with email:', email);
      
      await login(email, password);
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Show user-friendly error message
      Alert.alert(
        'Login Failed',
        error.message === 'Failed to read server response' 
          ? 'Unable to connect to the server. Please check your internet connection and try again.'
          : error.message || 'Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoCredentials = (credentials: { email: string; password: string }) => {
    setEmail(credentials.email);
    setPassword(credentials.password);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back Student!</Text>
      <Text style={styles.subtitle}>Login to find your perfect accommodation</Text>

      <DemoCredentials type="student" onUseCredentials={handleDemoCredentials} />

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#6b7280"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#6b7280"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Button
          style={styles.button}
          textStyle={styles.buttonText}
          onPress={handleLogin}
          loading={isLoading}>
          Login
        </Button>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/student/signup" asChild>
            <Text style={styles.link}>Sign up</Text>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0a0a0b',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: '#2a2a2b',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#7c3aed',
    height: 48,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#a1a1aa',
  },
  link: {
    color: '#7c3aed',
    fontWeight: '500',
  },
});