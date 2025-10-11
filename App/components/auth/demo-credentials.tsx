import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DEMO_CREDENTIALS } from '@/src/constants/demo-credentials';

interface DemoCredentialsProps {
  type: 'student' | 'owner';
  onUseCredentials: (credentials: typeof DEMO_CREDENTIALS[keyof typeof DEMO_CREDENTIALS]) => void;
}

export function DemoCredentials({ type, onUseCredentials }: DemoCredentialsProps) {
  const credentials = DEMO_CREDENTIALS[type];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Try Demo Account</Text>
        <Text style={styles.subtitle}>Test the platform with pre-configured demo credentials</Text>
      </View>

      <View style={styles.credentialsContainer}>
        <View style={styles.credentialRow}>
          <View>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{credentials.email}</Text>
          </View>
        </View>

        <View style={styles.credentialRow}>
          <View>
            <Text style={styles.label}>Password</Text>
            <Text style={styles.value}>{credentials.password}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.useButton}
        onPress={() => onUseCredentials(credentials)}
      >
        <Text style={styles.useButtonText}>Use Demo Credentials</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#a1a1ff',
  },
  credentialsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  credentialRow: {
    backgroundColor: '#2a2a4a',
    padding: 12,
    borderRadius: 8,
  },
  label: {
    fontSize: 12,
    color: '#8888aa',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  useButton: {
    backgroundColor: '#3a3a5a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  useButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});