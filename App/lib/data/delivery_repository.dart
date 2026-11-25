import 'dart:convert';

import 'package:http/http.dart' as http;

import '../core/config.dart';
import 'models/delivery_quote.dart';

/// The shop's own fee table, the same numbers as `DELIVERY_FEE_TABLE` in
/// `apps/web/src/lib/delivery-quote.ts`. It answers when the site cannot be reached, so the cart
/// always shows a fee.
class FeeBand {
  const FeeBand({required this.firstKgKs, required this.extraKgKs, required this.etaDays});

  final int firstKgKs;
  final int extraKgKs;
  final String etaDays;
}

const Map<String, FeeBand> kCityFeeBands = {
  'yangon': FeeBand(firstKgKs: 2500, extraKgKs: 1000, etaDays: '1-2'),
  'mandalay': FeeBand(firstKgKs: 3500, extraKgKs: 1200, etaDays: '2-3'),
  'nay pyi taw': FeeBand(firstKgKs: 3500, extraKgKs: 1200, etaDays: '2-3'),
  'naypyidaw': FeeBand(firstKgKs: 3500, extraKgKs: 1200, etaDays: '2-3'),
};

const FeeBand kDefaultFeeBand = FeeBand(firstKgKs: 4500, extraKgKs: 1500, etaDays: '3-5');
const int kFreeDeliveryFromKs = 150000;
const int kUnitWeightGrams = 300;
const int kMinBillableGrams = 1000;

/// Couriers bill whole kilograms from the first one.
int billableWeightGrams(int weightGrams) {
  final grams = weightGrams > 0 ? weightGrams : 0;
  final rounded = ((grams + 999) ~/ 1000) * 1000;
  return rounded < kMinBillableGrams ? kMinBillableGrams : rounded;
}

FeeBand feeBandFor(String city) {
  final key = city.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
  return kCityFeeBands[key] ?? kDefaultFeeBand;
}

DeliveryQuote tableQuote({required String city, required int weightGrams, int subtotalKs = 0}) {
  final band = feeBandFor(city);
  final billable = billableWeightGrams(weightGrams);
  final extraKg = billable ~/ 1000 - 1;
  final free = subtotalKs >= kFreeDeliveryFromKs;
  return DeliveryQuote(
    feeKs: free ? 0 : band.firstKgKs + extraKg * band.extraKgKs,
    service: 'MH Delivery · standard',
    etaDays: band.etaDays,
    source: 'table',
    weightGrams: billable,
    note: free ? 'free delivery over the shop\'s threshold' : 'priced on this phone: the site did not answer',
  );
}

abstract class DeliveryRepository {
  Future<DeliveryQuote> quote({required String city, required String township, required int units, required int subtotalKs});
}

/// Asks the site's `/api/delivery/quote` (which asks MH Delivery), and answers from the same table as
/// the site when it cannot.
class SiteDeliveryRepository implements DeliveryRepository {
  SiteDeliveryRepository({
    required this.config,
    http.Client? client,
    this.timeout = const Duration(seconds: 10),
  }) : _client = client ?? http.Client();

  final AppConfig config;
  final http.Client _client;
  final Duration timeout;

  @override
  Future<DeliveryQuote> quote({
    required String city,
    required String township,
    required int units,
    required int subtotalKs,
  }) async {
    final weightGrams = (units < 1 ? 1 : units) * kUnitWeightGrams;
    if (!config.hasSite) return tableQuote(city: city, weightGrams: weightGrams, subtotalKs: subtotalKs);
    final body = {
      'subtotalKs': subtotalKs,
      'request': {
        'reference': 'APP-${DateTime.now().millisecondsSinceEpoch}',
        'requestedAt': DateTime.now().toUtc().toIso8601String(),
        'merchant': {'name': 'MH Fashion', 'phone': '+95 9 000 112 233', 'address': 'Yangon, Myanmar'},
        'consignee': {
          'name': 'App customer',
          'phone': '',
          'email': '',
          'address': {'line1': '', 'township': township, 'city': city},
        },
        'parcels': [
          {
            'items': <Object?>[],
            'units': units,
            'weightGrams': weightGrams,
            'longestSideCm': 32,
          },
        ],
        'totals': {'units': units, 'weightGrams': weightGrams, 'codAmountKs': subtotalKs, 'cod': true},
        'payment': 'Cash on Delivery',
        'notes': '',
      },
    };
    try {
      final response = await _client
          .post(
            Uri.parse('${config.siteBase.replaceAll(RegExp(r'/+$'), '')}/api/delivery/quote'),
            headers: {'content-type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(timeout);
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, Object?>) {
          final quote = DeliveryQuote.fromJson(decoded);
          if (quote != null) return quote;
        }
      }
    } on Object {
      // Fall through to the table: a courier that cannot answer must not block the cart.
    }
    return tableQuote(city: city, weightGrams: weightGrams, subtotalKs: subtotalKs);
  }
}

/// The same fee the site would show, without a network. Used by tests and by a build with no site.
class TableDeliveryRepository implements DeliveryRepository {
  const TableDeliveryRepository();

  @override
  Future<DeliveryQuote> quote({required String city, required String township, required int units, required int subtotalKs}) async =>
      tableQuote(city: city, weightGrams: (units < 1 ? 1 : units) * kUnitWeightGrams, subtotalKs: subtotalKs);
}
