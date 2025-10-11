import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';

interface ButtonProps {
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ children, style, textStyle, onPress, loading, disabled }: ButtonProps) {
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        style,
        (loading || disabled) && styles.buttonDisabled
      ]} 
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={[styles.text, textStyle]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});