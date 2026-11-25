import 'package:flutter_test/flutter_test.dart';
import 'package:mh_fashion/data/models/product.dart';

void main() {
  test('a product row is read with the columns the web shop selects', () {
    final product = Product.tryFromRow(
      <String, Object?>{
        'id': 'p-1',
        'name': 'Classic Tee',
        'slug': 'classic-tee',
        'image_url': 'https://example.test/tee.webp',
        'is_new': true,
        'product_type': 'T-Shirt',
        'sub_brand': 'Singular',
        'is_customizable': 'full',
      },
      priceMinKs: 12000,
      priceMaxKs: 18000,
    );

    expect(product, isNotNull);
    expect(product!.id, 'p-1');
    expect(product.name, 'Classic Tee');
    expect(product.slug, 'classic-tee');
    expect(product.imageUrl, 'https://example.test/tee.webp');
    expect(product.isNew, isTrue);
    expect(product.productType, 'T-Shirt');
    expect(product.subBrand, 'Singular');
    expect(product.priceMinKs, 12000);
    expect(product.priceMaxKs, 18000);
    expect(product.displayPriceKs, 18000);
  });

  test('a row without an id or a name is dropped, not drawn blank', () {
    expect(Product.tryFromRow(<String, Object?>{'name': 'No id'}), isNull);
    expect(Product.tryFromRow(<String, Object?>{'id': 'p-1'}), isNull);
    expect(Product.tryFromRow(<String, Object?>{'id': 'p-1', 'name': '   '}), isNull);
  });

  test('an empty slug falls back to the id so a tap still resolves', () {
    final product = Product.tryFromRow(<String, Object?>{'id': 'p-9', 'name': 'Cap', 'slug': ''});
    expect(product!.slug, 'p-9');
  });

  test('a product survives the JSON round trip the cart uses', () {
    final product = Product.tryFromRow(
      <String, Object?>{'id': 'p-2', 'name': 'Hoodie', 'is_new': false, 'sub_brand': 'Streetwear'},
      priceMinKs: 30000,
      priceMaxKs: 30000,
    )!;
    final restored = Product.fromJson(product.toJson());
    expect(restored, isNotNull);
    expect(restored!.id, product.id);
    expect(restored.name, 'Hoodie');
    expect(restored.priceMaxKs, 30000);
    expect(restored.subBrand, 'Streetwear');
  });

  test('prices given as strings or doubles are read, not lost', () {
    final restored = Product.fromJson(<String, Object?>{
      'id': 'p-3',
      'name': 'Bag',
      'price_min_ks': '25000',
      'price_max_ks': 27500.4,
    });
    expect(restored!.priceMinKs, 25000);
    expect(restored.priceMaxKs, 27500);
  });
}
