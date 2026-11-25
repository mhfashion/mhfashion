/// One row of `public.products`, plus the price range from `product_price_ranges` — the same two
/// queries the web shop makes, so the app and the site always agree.
class Product {
  const Product({
    required this.id,
    required this.name,
    required this.slug,
    this.imageUrl,
    this.isNew = false,
    this.productType,
    this.subBrand,
    this.isCustomizable,
    this.priceMinKs = 0,
    this.priceMaxKs = 0,
  });

  final String id;
  final String name;
  final String slug;
  final String? imageUrl;
  final bool isNew;
  final String? productType;
  final String? subBrand;
  final String? isCustomizable;
  final int priceMinKs;
  final int priceMaxKs;

  /// A row without an id or a name cannot be shown, so it is dropped rather than drawn blank.
  static Product? tryFromRow(Map<String, Object?> row, {int priceMinKs = 0, int priceMaxKs = 0}) {
    final id = _text(row['id']);
    final name = _text(row['name']);
    if (id == null || name == null) return null;
    return Product(
      id: id,
      name: name,
      slug: _text(row['slug']) ?? id,
      imageUrl: _text(row['image_url']),
      isNew: row['is_new'] == true,
      productType: _text(row['product_type']),
      subBrand: _text(row['sub_brand']),
      isCustomizable: _text(row['is_customizable']),
      priceMinKs: priceMinKs,
      priceMaxKs: priceMaxKs,
    );
  }

  /// The lower price is what a card shows; the range is what the product page shows.
  int get displayPriceKs => priceMaxKs > 0 ? priceMaxKs : priceMinKs;

  Product withPrices({required int minKs, required int maxKs}) => Product(
        id: id,
        name: name,
        slug: slug,
        imageUrl: imageUrl,
        isNew: isNew,
        productType: productType,
        subBrand: subBrand,
        isCustomizable: isCustomizable,
        priceMinKs: minKs,
        priceMaxKs: maxKs,
      );

  Map<String, Object?> toJson() => {
        'id': id,
        'name': name,
        'slug': slug,
        'image_url': imageUrl,
        'is_new': isNew,
        'product_type': productType,
        'sub_brand': subBrand,
        'is_customizable': isCustomizable,
        'price_min_ks': priceMinKs,
        'price_max_ks': priceMaxKs,
      };

  static Product? fromJson(Map<String, Object?> json) => tryFromRow(
        json,
        priceMinKs: _integer(json['price_min_ks']),
        priceMaxKs: _integer(json['price_max_ks']),
      );

  @override
  bool operator ==(Object other) => other is Product && other.id == id;

  @override
  int get hashCode => id.hashCode;
}

String? _text(Object? value) {
  if (value is String) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}

int _integer(Object? value) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}
