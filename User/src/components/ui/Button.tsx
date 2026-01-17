import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, typography, shadows, spacing } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const sizeStyles = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  };

  const textSizeStyles = {
    sm: { fontSize: 14 },
    md: { fontSize: 16 },
    lg: { fontSize: 18 },
  };

  const isDisabled = disabled || loading;

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary.main : colors.primary.contrast} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              textSizeStyles[size],
              variant === 'outline' && styles.outlineText,
              variant === 'ghost' && styles.ghostText,
              icon ? styles.textWithIcon : undefined,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={[fullWidth && styles.fullWidth, style]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isDisabled ? ['#475569', '#334155'] : [colors.primary.light, colors.primary.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.container,
            sizeStyles[size],
            shadows.md,
            isDisabled && styles.disabled,
          ]}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.container,
        sizeStyles[size],
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  text: {
    color: colors.primary.contrast,
    fontWeight: typography.button.fontWeight,
  },
  textWithIcon: {
    marginLeft: spacing.sm,
  },
  secondary: {
    backgroundColor: colors.secondary.main,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  outlineText: {
    color: colors.primary.main,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.text.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
});
