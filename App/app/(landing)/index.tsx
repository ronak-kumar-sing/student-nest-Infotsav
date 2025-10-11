import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import ModernHeroSection from '@/components/landing/ModernHeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import { Button } from '@/components/ui/button';
import { config } from '@/src/config';

export default function LandingScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <ModernHeroSection />

      {/* Role Selection */}
      <View style={styles.roleSelectionContainer}>
        <Link href="/(auth)/student/signup" asChild>
          <Button style={styles.roleButton}>
            I'm a Student Looking for Accommodation
          </Button>
        </Link>

        <Link href="/(auth)/owner/signup" asChild>
          <Button style={{ ...styles.roleButton, backgroundColor: '#3b82f6' }}>
            I'm a Property Owner
          </Button>
        </Link>

        <Link href="/(auth)/student/login" asChild>
          <Button 
            style={{
              ...styles.roleButton,
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: '#2a2a2b'
            }}>
            Already have an account? Log in
          </Button>
        </Link>
      </View>

      {/* Features Section */}
      <FeaturesSection />

      {/* How It Works */}
      <HowItWorksSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  contentContainer: {
    flexGrow: 1,
  },
  roleSelectionContainer: {
    padding: 20,
    gap: 12,
  },
  roleButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
  },
  ownerButton: {
    backgroundColor: '#3b82f6',
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2a2a2b',
  },
});