/// Where the app reads from. Every value is a `--dart-define`, so one build can point at the
/// production shop, a preview Worker or a local `next start` without touching code:
///
/// ```
/// flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=... \
///   --dart-define=SITE_BASE=http://10.0.2.2:3000
/// ```
///
/// The app reads the same Supabase project as the web shop, so a product the admin changes on the
/// web appears in the app on its next refresh — no copy, no second catalogue.
class AppConfig {
  const AppConfig({
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    required this.siteBase,
  });

  final String supabaseUrl;
  final String supabaseAnonKey;
  final String siteBase;

  static const AppConfig fromEnvironment = AppConfig(
    supabaseUrl: String.fromEnvironment('SUPABASE_URL'),
    supabaseAnonKey: String.fromEnvironment('SUPABASE_ANON_KEY'),
    siteBase: String.fromEnvironment(
      'SITE_BASE',
      defaultValue: 'https://mhfashion.mhfashionmm.workers.dev',
    ),
  );

  /// The catalogue is reachable only when both Supabase values were given at build time.
  bool get hasCatalogue => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  bool get hasSite => siteBase.isNotEmpty;

  String get restBase => '${supabaseUrl.replaceAll(RegExp(r'/+$'), '')}/rest/v1';

  @override
  String toString() => 'AppConfig(supabase: ${supabaseUrl.isEmpty ? "unset" : "set"}, site: $siteBase)';
}
