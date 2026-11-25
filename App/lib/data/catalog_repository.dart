import 'dart:convert';

import 'package:http/http.dart' as http;

import '../core/config.dart';
import 'models/product.dart';

/// The catalogue the app shows. `SupabaseCatalogRepository` is the real one; the others exist for a
/// build without keys and for tests.
abstract class CatalogRepository {
  Future<List<Product>> newArrivals({int limit = 8});

  Future<List<Product>> products({String? search, String? subBrand, int limit = 60});

  Future<Product?> productBySlug(String slug);
}

class EmptyCatalogRepository implements CatalogRepository {
  const EmptyCatalogRepository();

  @override
  Future<List<Product>> newArrivals({int limit = 8}) async => const <Product>[];

  @override
  Future<List<Product>> products({String? search, String? subBrand, int limit = 60}) async => const <Product>[];

  @override
  Future<Product?> productBySlug(String slug) async => null;
}

class CatalogException implements Exception {
  const CatalogException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Reads the same Supabase project as the web shop with the public anon key, over PostgREST. The
/// columns and the two-query merge (products, then `product_price_ranges`) mirror
/// `apps/web/src/lib/products.ts`, so the app cannot drift from the site.
class SupabaseCatalogRepository implements CatalogRepository {
  SupabaseCatalogRepository({
    required this.config,
    http.Client? client,
    this.timeout = const Duration(seconds: 12),
  }) : _client = client ?? http.Client();

  final AppConfig config;
  final http.Client _client;
  final Duration timeout;

  Map<String, String> get _headers => {
        'apikey': config.supabaseAnonKey,
        'authorization': 'Bearer ${config.supabaseAnonKey}',
        'accept': 'application/json',
      };

  static const String _columns = 'id,name,slug,image_url,is_new,product_type,sub_brand,is_customizable';

  Future<List<Map<String, Object?>>> _get(String path, Map<String, String> query) async {
    if (!config.hasCatalogue) throw const CatalogException('catalogue_not_configured');
    final uri = Uri.parse('${config.restBase}/$path').replace(queryParameters: query);
    final response = await _client.get(uri, headers: _headers).timeout(timeout);
    if (response.statusCode != 200) {
      throw CatalogException('catalogue_http_${response.statusCode}');
    }
    final decoded = jsonDecode(response.body);
    if (decoded is! List<Object?>) throw const CatalogException('catalogue_bad_body');
    return decoded.whereType<Map<String, Object?>>().toList();
  }

  /// Prices live in a view with no foreign key, so they are fetched for the ids on screen and merged,
  /// exactly as the site does it.
  Future<Map<String, ({int min, int max})>> _prices(List<String> productIds) async {
    if (productIds.isEmpty) return const {};
    final rows = await _get('product_price_ranges', {
      'select': 'product_id,price_min_ks,price_max_ks',
      'product_id': 'in.(${productIds.join(",")})',
    });
    final prices = <String, ({int min, int max})>{};
    for (final row in rows) {
      final id = row['product_id'];
      if (id is! String) continue;
      prices[id] = (min: _asInt(row['price_min_ks']), max: _asInt(row['price_max_ks']));
    }
    return prices;
  }

  Future<List<Product>> _withPrices(List<Map<String, Object?>> rows) async {
    final prices = await _prices([for (final row in rows) if (row['id'] is String) row['id']! as String]);
    final products = <Product>[];
    for (final row in rows) {
      final id = row['id'] is String ? row['id']! as String : '';
      final price = prices[id];
      final product = Product.tryFromRow(row, priceMinKs: price?.min ?? 0, priceMaxKs: price?.max ?? 0);
      if (product != null) products.add(product);
    }
    return products;
  }

  @override
  Future<List<Product>> newArrivals({int limit = 8}) async {
    final rows = await _get('products', {
      'select': _columns,
      'is_new': 'eq.true',
      'order': 'created_at.desc',
      'limit': '$limit',
    });
    return _withPrices(rows);
  }

  @override
  Future<List<Product>> products({String? search, String? subBrand, int limit = 60}) async {
    final term = (search ?? '').trim();
    final query = <String, String>{
      'select': _columns,
      'order': 'created_at.desc',
      'limit': '$limit',
    };
    if (term.isNotEmpty) query['name'] = 'ilike.*${_escape(term)}*';
    if (subBrand != null && subBrand.trim().isNotEmpty) query['sub_brand'] = 'eq.${subBrand.trim()}';
    final rows = await _get('products', query);
    return _withPrices(rows);
  }

  @override
  Future<Product?> productBySlug(String slug) async {
    final rows = await _get('products', {'select': _columns, 'slug': 'eq.$slug', 'limit': '1'});
    if (rows.isEmpty) return null;
    final products = await _withPrices(rows);
    return products.isEmpty ? null : products.first;
  }

  /// PostgREST reads `*` and `,` as syntax, so a typed term cannot rewrite the filter.
  static String _escape(String term) => term.replaceAll(RegExp(r'[,()*%\\]'), ' ').trim();
}

int _asInt(Object? value) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}
