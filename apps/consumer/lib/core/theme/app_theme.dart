import 'package:flutter/material.dart';

class AppTheme {
  static const Color forestGreen = Color(0xFF1E3F20);
  static const Color lightGreen = Color(0xFFE8F5E9);
  static const Color accessibleGold = Color(0xFFC5A059);
  static const Color errorRed = Color(0xFFD32F2F);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: const ColorScheme.light(
        primary: forestGreen,
        secondary: accessibleGold,
        error: errorRed,
        background: Colors.white,
        surface: lightGreen,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: forestGreen,
          letterSpacing: -0.5,
        ),
        titleMedium: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: Colors.black87,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: Colors.black87,
          height: 1.5,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: Colors.black54,
          height: 1.4,
        ),
      ),
      buttonTheme: const ButtonThemeData(
        buttonColor: forestGreen,
        textTheme: ButtonTextTheme.primary,
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: const ColorScheme.dark(
        primary: lightGreen,
        secondary: accessibleGold,
        error: errorRed,
        background: Color(0xFF121212),
        surface: Color(0xFF1E271E),
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: Colors.white,
          letterSpacing: -0.5,
        ),
        titleMedium: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: Colors.white70,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: Colors.white90,
          height: 1.5,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: Colors.white70,
          height: 1.4,
        ),
      ),
    );
  }
}
