import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../core/format.dart';
import '../core/strings.dart';
import '../data/catalog_repository.dart';
import '../data/delivery_repository.dart';
import '../data/models/delivery_quote.dart';
import '../data/models/order_draft.dart';
import '../data/models/product.dart';
import '../data/storage.dart';

const String kCartKey = 'mh.cart.v1';
const String kOrdersKey = 'mh.orders.v1';
const String kWishlistKey = 'mh.wishlist.v1';
const String kSettingsKey = 'mh.settings.v1';

/// Everything the screens share: the catalogue, the cart, the wishlist, the orders this phone placed
/// and the two preferences. A `ChangeNotifier`, so a change anywhere redraws every screen that shows it.
class AppState extends ChangeNotifier {
  AppState({
    required this.catalog,
    required this.delivery,
    required this.store,
  });

  final CatalogRepository catalog;
  final DeliveryRepository delivery;
  final KeyValueStore store;

  String locale = 'en';
  String currency = 'Ks';
  int usdRateKs = kDefaultUsdRateKs;

  final Map<String, OrderLine> _cart = {};
  final Set<String> _wishlist = {};
  final List<PlacedOrder> _orders = [];

  List<OrderLine> get cartLines => _cart.values.toList(growable: false);

  Set<String> get wishlist => Set.unmodifiable(_wishlist);

  List<PlacedOrder> get orders => List.unmodifiable(_orders);

  int get cartCount => _cart.values.fold(0, (sum, line) => sum + line.quantity);

  int get subtotalKs => _cart.values.fold(0, (sum, line) => sum + line.totalKs);

  Strings get s => Strings.of(locale);

  bool inCart(String productId) => _cart.containsKey(productId);

  int quantityOf(String productId) => _cart[productId]?.quantity ?? 0;

  Future<void> load() async {
    final settings = await _readJson(kSettingsKey);
    if (settings != null) {
      locale = Strings.supported.contains(settings['locale']) ? settings['locale']! as String : 'en';
      currency = settings['currency'] == 'USD' ? 'USD' : 'Ks';
      final rate = settings['usd_rate_ks'];
      if (rate is int && rate > 0) usdRateKs = rate;
    }
    final cart = await _readJson(kCartKey);
    if (cart != null && cart['lines'] is List<Object?>) {
      for (final entry in cart['lines']! as List<Object?>) {
        if (entry is! Map<String, Object?>) continue;
        final line = OrderLine.fromJson(entry);
        if (line != null) _cart[line.product.id] = line;
      }
    }
    final wishlist = await _readJson(kWishlistKey);
    if (wishlist != null && wishlist['ids'] is List<Object?>) {
      for (final id in wishlist['ids']! as List<Object?>) {
        if (id is String) _wishlist.add(id);
      }
    }
    final orders = await _readJson(kOrdersKey);
    if (orders != null && orders['orders'] is List<Object?>) {
      for (final entry in orders['orders']! as List<Object?>) {
        if (entry is! Map<String, Object?>) continue;
        final order = PlacedOrder.fromJson(entry);
        if (order != null) _orders.add(order);
      }
    }
    notifyListeners();
  }

  Future<Map<String, Object?>?> _readJson(String key) async {
    final raw = await store.read(key);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      return decoded is Map<String, Object?> ? decoded : null;
    } on FormatException {
      return null;
    }
  }

  Future<void> setLocale(String value) async {
    if (!Strings.supported.contains(value) || value == locale) return;
    locale = value;
    notifyListeners();
    await _saveSettings();
  }

  Future<void> setCurrency(String value) async {
    final next = value == 'USD' ? 'USD' : 'Ks';
    if (next == currency) return;
    currency = next;
    notifyListeners();
    await _saveSettings();
  }

  Future<void> _saveSettings() => store.write(
        kSettingsKey,
        jsonEncode({'locale': locale, 'currency': currency, 'usd_rate_ks': usdRateKs}),
      );

  Future<void> addToCart(Product product, {int quantity = 1}) async {
    final existing = _cart[product.id];
    _cart[product.id] = OrderLine(
      product: product,
      quantity: (existing?.quantity ?? 0) + (quantity < 1 ? 1 : quantity),
    );
    notifyListeners();
    await _saveCart();
  }

  Future<void> setQuantity(String productId, int quantity) async {
    final line = _cart[productId];
    if (line == null) return;
    if (quantity < 1) {
      _cart.remove(productId);
    } else {
      _cart[productId] = OrderLine(product: line.product, quantity: quantity);
    }
    notifyListeners();
    await _saveCart();
  }

  Future<void> removeFromCart(String productId) async {
    if (_cart.remove(productId) == null) return;
    notifyListeners();
    await _saveCart();
  }

  Future<void> clearCart() async {
    if (_cart.isEmpty) return;
    _cart.clear();
    notifyListeners();
    await _saveCart();
  }

  Future<void> _saveCart() => store.write(
        kCartKey,
        jsonEncode({'lines': [for (final line in _cart.values) line.toJson()]}),
      );

  Future<bool> toggleWishlist(String productId) async {
    final added = _wishlist.add(productId);
    if (!added) _wishlist.remove(productId);
    notifyListeners();
    await store.write(kWishlistKey, jsonEncode({'ids': _wishlist.toList()}));
    return added;
  }

  bool isWished(String productId) => _wishlist.contains(productId);

  /// Places the order this phone is holding: the reference continues the shop's `MH` series, the lines
  /// and the address are kept, and the cart empties. Returns the order so the caller can show it.
  Future<PlacedOrder> placeOrder({
    required DeliveryAddress address,
    required String note,
    required DeliveryQuote quote,
    DateTime? now,
  }) async {
    final lines = cartLines;
    final placedAt = now ?? DateTime.now();
    final order = PlacedOrder(
      reference: formatOrderReference(1000 + _orders.length),
      placedAt: placedAt,
      lines: lines,
      address: address,
      deliveryFeeKs: quote.feeKs,
      note: note,
    );
    _orders.insert(0, order);
    _cart.clear();
    notifyListeners();
    await _saveCart();
    await store.write(kOrdersKey, jsonEncode({'orders': [for (final order in _orders) order.toJson()]}));
    return order;
  }
}
