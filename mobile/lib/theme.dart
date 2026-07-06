import 'package:flutter/material.dart';

/// Gasilska barvna shema (usklajeno z web portalom).
class GasilColors {
  static const primary = Color(0xFFCC2200);
  static const primaryDark = Color(0xFF991900);
  static const bg = Color(0xFFF8F8F8);
  static const card = Color(0xFFFFFFFF);
  static const text = Color(0xFF2D2D2D);
  static const textMuted = Color(0xFF888888);
  static const success = Color(0xFF16A34A);
  static const warning = Color(0xFFCA8A04);
  static const danger = Color(0xFFDC2626);
}

ThemeData buildGasilTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: GasilColors.bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: GasilColors.primary,
      primary: GasilColors.primary,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: GasilColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
    ),
    cardTheme: CardThemeData(
      color: GasilColors.card,
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: GasilColors.primary,
        foregroundColor: Colors.white,
      ),
    ),
  );
}
