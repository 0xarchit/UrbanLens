import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, shadows } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'gradient';
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', style }: CardProps) {
  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={[colors.background.secondary, colors.background.tertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, styles.gradient, shadows.md, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  if (variant === 'glass') {
    return (
      <View style={[styles.container, styles.glass, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.default, shadows.sm, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: 16,
  },
  default: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  glass: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  gradient: {
    borderWidth: 1,
    borderColor: colors.border.accent,
  },
});
