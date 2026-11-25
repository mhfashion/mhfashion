import 'package:material_ui/material_ui.dart';

/// The web shop's colours: near-black canvas, lime accent, white type.
const Color kAccent = Color(0xFF4C9D16);
const Color kCanvas = Color(0xFF0C0C0C);
const Color kSurface = Color(0xFF151515);
const Color kLine = Color(0xFF262626);
const Color kMuted = Color(0xFF9CA3AF);

ThemeData buildTheme() {
  final base = ThemeData.dark(useMaterial3: true);
  final scheme = base.colorScheme.copyWith(
    primary: kAccent,
    secondary: kAccent,
    surface: kSurface,
    onSurface: Colors.white,
    outline: kLine,
  );
  return base.copyWith(
    colorScheme: scheme,
    scaffoldBackgroundColor: kCanvas,
    appBarTheme: const AppBarTheme(
      backgroundColor: kCanvas,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: -0.4),
    ),
    cardTheme: CardThemeData(
      color: kSurface,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: kLine)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kSurface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kLine)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kLine)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kAccent, width: 1.5)),
      labelStyle: const TextStyle(color: kMuted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: kAccent,
        foregroundColor: Colors.black,
        minimumSize: const Size.fromHeight(52),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: kCanvas,
      indicatorColor: kAccent.withValues(alpha: 0.18),
      labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 12, color: Colors.white)),
      iconTheme: WidgetStateProperty.all(const IconThemeData(color: Colors.white)),
    ),
    snackBarTheme: const SnackBarThemeData(backgroundColor: kSurface, contentTextStyle: TextStyle(color: Colors.white)),
    dividerTheme: const DividerThemeData(color: kLine, space: 1),
  );
}
