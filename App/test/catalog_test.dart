import 'package:flutter_test/flutter_test.dart';
import 'package:mh_fashion/data/catalog_repository.dart';
import 'package:mh_fashion/data/models/product.dart';
import 'package:mh_fashion/core/config.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const AppConfig _config = AppConfig(
  supabaseUrl: 'https://shop.supabase.co',
  supabaseAnonKey: 'anon-key',
  siteBase: 'https://shop.test',
);

void main() {
  test('the catalogue asks PostgREST for the same columns as the web shop, then the prices', () async {
    final requests = <Uri>[];
    final client = MockClient((request) async {
      requests.add(request.url);
      expect(request.headers['apikey'], 'anon-key');
      expect(request.headers['authorization'], 'Bearer anon-key');
      if (request.url.path.endsWith('/product_price_ranges')) {
        return http.Response('[{"product_id":"p-1","price_min_ks":12000,"price_max_ks":18000}]', 200);
      }
      return http.Response(
        '[{"id":"p-1","name":"Classic Tee","slug":"classic-tee","image_url":null,"is_new":true,"product_type":"T-Shirt","sub_brand":"Singular","is_customizable":"full"}]',
        200,
      );
    });

    final catalog = SupabaseCatalogRepository(config: _config, client: client);
    final products = await catalog.products();

    expect(products, hasLength(1));
    expect(products.first.name, 'Classic Tee');
    expect(products.first.priceMinKs, 12000);
    expect(products.first.priceMaxKs, 18000);
    expect(requests.first.path, '/rest/v1/products');
    expect(requests.first.queryParameters['select'], contains('is_customizable'));
    expect(requests.last.path, '/rest/v1/product_price_ranges');
    expect(requests.last.queryParameters['product_id'], 'in.(p-1)');
  });

  test('a typed search cannot rewrite the PostgREST filter', () async {
    late Uri seen;
    final client = MockClient((request) async {
      seen = request.url;
      return http.Response('[]', 200);
    });
    final catalog = SupabaseCatalogRepository(config: _config, client: client);
    await catalog.products(search: 'tee,or(name.eq.*)');

    expect(seen.queryParameters['name'], 'ilike.*tee or name.eq.*');
  });

  test('a sub-brand filter reaches the query as an equality', () async {
    late Uri seen;
    final client = MockClient((request) async {
      seen = request.url;
      return http.Response('[]', 200);
    });
    await SupabaseCatalogRepository(config: _config, client: client).products(subBrand: 'Kids');
    expect(seen.queryParameters['sub_brand'], 'eq.Kids');
  });

  test('an unconfigured build refuses instead of pretending the shop is empty', () async {
    const AppConfig empty = AppConfig(supabaseUrl: '', supabaseAnonKey: '', siteBase: '');
    expect(() => SupabaseCatalogRepository(config: empty).products(), throwsA(isA<CatalogException>()));
    expect(await const EmptyCatalogRepository().products(), isEmpty);
  });

  test('a failed request is a CatalogException with the status', () async {
    final client = MockClient((_) async => http.Response('nope', 503));
    expect(
      () => SupabaseCatalogRepository(config: _config, client: client).newArrivals(),
      throwsA(isA<CatalogException>()),
    );
  });

  test('a product is found by its slug', () async {
    final client = MockClient((request) async {
      if (request.url.path.endsWith('/product_price_ranges')) {
        return http.Response('[{"product_id":"p-7","price_min_ks":9000,"price_max_ks":9000}]', 200);
      }
      return http.Response('[{"id":"p-7","name":"Jersey","slug":"jersey"}]', 200);
    });
    final product = await SupabaseCatalogRepository(config: _config, client: client).productBySlug('jersey');
    expect(product?.id, 'p-7');
    expect(product?.displayPriceKs, 9000);
  });

  test('an empty product list never asks for prices', () async {
    final paths = <String>[];
    final client = MockClient((request) async {
      paths.add(request.url.path);
      return http.Response('[]', 200);
    });
    final products = await SupabaseCatalogRepository(config: _config, client: client).products();
    expect(products, isEmpty);
    expect(paths, hasLength(1));
  });

  test('the product model keeps its identity by id', () {
    const Product one = Product(id: 'p-1', name: 'A', slug: 'a');
    const Product two = Product(id: 'p-1', name: 'B', slug: 'b');
    expect(one, two);
    expect(one.hashCode, two.hashCode);
  });
}
