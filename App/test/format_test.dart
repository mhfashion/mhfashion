import 'package:flutter_test/flutter_test.dart';
import 'package:mh_fashion/core/format.dart';

void main() {
  test('kyat is grouped and named in the reader\'s language', () {
    expect(formatKs(12000), '12,000 Ks');
    expect(formatKs(12000, locale: 'my'), '12,000 ကျပ်');
    expect(formatKs(0), '0 Ks');
    expect(formatKs(1234567), '1,234,567 Ks');
  });

  test('dollars are the kyat price at the admin rate', () {
    expect(formatUsd(4500), r'$1.00');
    expect(formatUsd(4500, usdRateKs: 3000), r'$1.50');
    expect(formatUsd(4500, usdRateKs: 0), r'$1.00', reason: 'a zero rate falls back to the default');
  });

  test('a price range prints once when the low and high price are the same', () {
    expect(formatPriceRange(12000, 12000), '12,000 Ks');
    expect(formatPriceRange(0, 12000), '12,000 Ks');
    expect(formatPriceRange(12000, 18000), '12,000 Ks – 18,000 Ks');
    expect(formatPriceRange(0, 0), '—');
    expect(formatPriceRange(12000, 18000, currency: 'USD', usdRateKs: 6000), r'$2.00 – $3.00');
  });

  test('a date is shown in Yangon time whatever the device clock says', () {
    final utc = DateTime.utc(2026, 11, 25, 18, 30);
    expect(formatYangonDate(utc), '26 Nov 2026', reason: '18:30 UTC is 01:00 the next day in Yangon');
    expect(formatYangonDate(DateTime.utc(2026, 11, 25, 10, 0)), '25 Nov 2026');
  });

  test('an order reference continues the shop series', () {
    expect(formatOrderReference(1000), 'MH2000');
    expect(formatOrderReference(1), 'MH1001');
  });
}
