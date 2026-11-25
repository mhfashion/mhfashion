import 'package:intl/intl.dart';

/// The shop prices in kyat and shows dollars at the admin's rate. Both formatters are the ones the
/// web shop uses, so a price reads the same in the app and on the site.
const int kDefaultUsdRateKs = 4500;

String formatKs(num amountKs, {String locale = 'en'}) {
  final rounded = amountKs.round();
  final grouped = NumberFormat.decimalPattern('en').format(rounded);
  return locale == 'my' ? '$grouped ကျပ်' : '$grouped Ks';
}

String formatUsd(num amountKs, {int usdRateKs = kDefaultUsdRateKs}) {
  final rate = usdRateKs > 0 ? usdRateKs : kDefaultUsdRateKs;
  return NumberFormat.currency(locale: 'en_US', symbol: r'$', decimalDigits: 2).format(amountKs / rate);
}

/// A price range is what the catalogue knows: a style with several colours or sizes has a low and a
/// high price. A single price prints once.
String formatPriceRange(int minKs, int maxKs, {String locale = 'en', String currency = 'Ks', int usdRateKs = kDefaultUsdRateKs}) {
  String one(num value) => currency == 'USD' ? formatUsd(value, usdRateKs: usdRateKs) : formatKs(value, locale: locale);
  if (maxKs <= 0) return '—';
  if (minKs <= 0 || minKs == maxKs) return one(maxKs);
  return '${one(minKs)} – ${one(maxKs)}';
}

/// Every date the shop shows is Yangon time, whatever the phone's clock is set to.
String formatYangonDate(DateTime value, {String locale = 'en'}) {
  final yangon = value.toUtc().add(const Duration(hours: 6, minutes: 30));
  return DateFormat('d MMM yyyy').format(yangon);
}

/// The order reference the shop quotes: `MH` and four digits and up.
String formatOrderReference(int sequence) => 'MH${1000 + sequence}';
