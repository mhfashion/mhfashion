import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mh_fashion/core/config.dart';
import 'package:mh_fashion/data/delivery_repository.dart';
import 'package:mh_fashion/data/models/delivery_quote.dart';

const AppConfig _config = AppConfig(supabaseUrl: '', supabaseAnonKey: '', siteBase: 'https://shop.test');

void main() {
  test('a parcel is billed in whole kilograms from the first one', () {
    expect(billableWeightGrams(0), 1000);
    expect(billableWeightGrams(900), 1000);
    expect(billableWeightGrams(1000), 1000);
    expect(billableWeightGrams(1001), 2000);
    expect(billableWeightGrams(2400), 3000);
  });

  test('the shop table prices every band the site prices', () {
    final yangon = tableQuote(city: 'Yangon', weightGrams: 900);
    expect(yangon.feeKs, 2500);
    expect(yangon.etaDays, '1-2');
    expect(yangon.source, 'table');

    expect(tableQuote(city: 'Mandalay', weightGrams: 2400).feeKs, 3500 + 2 * 1200);
    expect(tableQuote(city: 'nay pyi taw', weightGrams: 900).feeKs, 3500);
    expect(tableQuote(city: 'Hpa-An', weightGrams: 900).feeKs, 4500);
    expect(tableQuote(city: '  yAnGoN ', weightGrams: 900).feeKs, 2500);

    final free = tableQuote(city: 'Yangon', weightGrams: 900, subtotalKs: 150000);
    expect(free.feeKs, 0);
    expect(free.note, contains('free delivery'));
  });

  test('the site quote is used when it answers', () async {
    final client = MockClient((request) async {
      expect(request.url.toString(), 'https://shop.test/api/delivery/quote');
      expect(request.headers['content-type'], startsWith('application/json'));
      expect(request.body, contains('"city":"Mandalay"'));
      expect(request.body, contains('"units":3'));
      return http.Response('{"feeKs":3200,"service":"MH Express","etaDays":"1","source":"courier","weightGrams":3000}', 200);
    });

    final quote = await SiteDeliveryRepository(config: _config, client: client).quote(
      city: 'Mandalay',
      township: 'Chanayethazan',
      units: 3,
      subtotalKs: 63000,
    );
    expect(quote.feeKs, 3200);
    expect(quote.source, 'courier');
    expect(quote.fromTable, isFalse);
    expect(quote.weightGrams, 3000);
  });

  test('a failing site falls back to the table instead of blocking the cart', () async {
    final client = MockClient((_) async => http.Response('{"error":"rate_limited"}', 429));
    final quote = await SiteDeliveryRepository(config: _config, client: client).quote(
      city: 'Yangon',
      township: 'Mingalar Taung Nyunt',
      units: 2,
      subtotalKs: 24000,
    );
    expect(quote.source, 'table');
    expect(quote.fromTable, isTrue);
    expect(quote.feeKs, 2500);
    expect(quote.note, contains('this phone'));
  });

  test('a body without a fee is a fallback, not a crash', () async {
    final client = MockClient((_) async => http.Response('{"service":"MH"}', 200));
    final quote = await SiteDeliveryRepository(config: _config, client: client).quote(
      city: 'Yangon',
      township: '',
      units: 1,
      subtotalKs: 0,
    );
    expect(quote.source, 'table');
  });

  test('a build with no site answers from the table without a request', () async {
    const AppConfig offline = AppConfig(supabaseUrl: '', supabaseAnonKey: '', siteBase: '');
    final quote = await SiteDeliveryRepository(config: offline).quote(
      city: 'Yangon',
      township: '',
      units: 1,
      subtotalKs: 10000,
    );
    expect(quote.feeKs, 2500);
    expect(quote.source, 'table');
  });

  test('a quote reads its own JSON, and refuses one without a fee', () {
    final quote = DeliveryQuote.fromJson(<String, Object?>{
      'feeKs': 2500.6,
      'service': 'MH Delivery',
      'etaDays': '1-2',
      'source': 'table',
      'weightGrams': 1000,
    });
    expect(quote?.feeKs, 2501);
    expect(quote?.etaDays, '1-2');
    expect(DeliveryQuote.fromJson(<String, Object?>{'service': 'MH'}), isNull);
  });
}
