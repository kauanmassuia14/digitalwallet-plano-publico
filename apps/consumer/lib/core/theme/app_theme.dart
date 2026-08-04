import 'package:flutter/material.dart';

class AppTheme {
  // Cor Principal Main oficial da marca CycleTrack: #0C343D (Dark Teal Corporativo)
  static const Color mainTeal = Color(0xFF0C343D);
  static const Color tewoDarkBlue = Color(0xFF0C343D); // Alias de compatibilidade
  static const Color tewoMediumBlue = Color(0xFF0C343D);
  static const Color tewoBrightBlue = Color(0xFF0A4854);
  static const Color tewoLightBg = Color(0xFFF4F7FA);
  static const Color tewoSurfaceWhite = Color(0xFFFFFFFF);
  
  static const Color tewoGreenAccent = Color(0xFF00A86B);
  static const Color tewoTextDark = Color(0xFF0F172A);
  static const Color tewoTextMuted = Color(0xFF64748B);
  static const Color tewoBorder = Color(0xFFE2E8F0);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: tewoLightBg,
      colorScheme: const ColorScheme.light(
        primary: mainTeal,
        secondary: tewoGreenAccent,
        surface: tewoSurfaceWhite,
        background: tewoLightBg,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: tewoTextDark,
        onBackground: tewoTextDark,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: mainTeal,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: mainTeal,
          foregroundColor: Colors.white,
          elevation: 2,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: tewoSurfaceWhite,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: tewoBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: tewoBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: mainTeal, width: 2),
        ),
        hintStyle: const TextStyle(color: tewoTextMuted, fontSize: 14),
      ),
      cardTheme: CardTheme(
        color: tewoSurfaceWhite,
        elevation: 1,
        shadowColor: Colors.black.withOpacity(0.05),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: tewoBorder, width: 1),
        ),
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 30,
          fontWeight: FontWeight.w800,
          color: mainTeal,
          letterSpacing: -0.5,
        ),
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: tewoTextDark,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: tewoTextDark,
        ),
        bodyLarge: TextStyle(
          fontSize: 15,
          color: tewoTextDark,
          height: 1.5,
        ),
        bodyMedium: TextStyle(
          fontSize: 13,
          color: tewoTextMuted,
          height: 1.4,
        ),
      ),
    );
  }
}
