import 'package:flutter_test/flutter_test.dart';
import 'package:mh_fashion/data/catalog_repository.dart';
import 'package:mh_fashion/data/delivery_repository.dart';
import 'package:mh_fashion/data/models/delivery_quote.dart';
import 'package:mh_fashion/data/models/order_draft.dart';
import 'package:mh_fashion/data/models/product.dart';
import 'package:mh_fashion/data/storage.dart';
import 'package:mh_fashion/state/app_state.dart';

const Product _tee = Product(id: 'p-1', name: 'Classic Tee', slug: 'classic-tee', priceMinKs: 12000, priceMaxKs: 12000);
const Product _hoodie = Product(id: 'p-2', name: 'Hoodie', slug: 'hoodie', priceMinKs: 30000, priceMaxKs: 30000);

AppState _state([KeyValueStore? store]) => AppState(
      catalog: const EmptyCatalogRepository(),
      delivery: const TableDeliveryRepository(),
      store: store ?? MemoryStore(),
    );

const DeliveryAddress _address = DeliveryAddress(
  name: 'Kyaw Min',
  phone: '+95 9 449 330 127',
  address: 'No. 45/A',
  township: 'Mingalar Taung Nyunt',
  city: 'Yangon',
);

void main() {
  test('adding a product twice raises its quantity instead of adding a second line', () async {
    final state = _state();
    await state.addToCart(_tee);
    await state.addToCart(_tee);
    await state.addToCart(_hoodie);

    expect(state.cartLines, hasLength(2));
    expect(state.quantityOf('p-1'), 2);
    expect(state.cartCount, 3);
    expect(state.subtotalKs, 12000 * 2 + 30000);
  });

  test('a quantity of zero removes the line, and remove empties it', () async {
    final state = _state();
    await state.addToCart(_tee);
    await state.setQuantity('p-1', 0);
    expect(state.cartLines, isEmpty);

    await state.addToCart(_hoodie);
    await state.removeFromCart('p-2');
    expect(state.cartCount, 0);
  });

  test('the cart survives a restart because it is written to the store', () async {
    final store = MemoryStore();
    final first = _state(store);
    await first.addToCart(_tee, quantity: 3);

    final second = _state(store);
    await second.load();
    expect(second.quantityOf('p-1'), 3);
    expect(second.subtotalKs, 36000);
  });

  test('a broken stored cart is ignored, not fatal', () async {
    final store = MemoryStore();
    await store.write(kCartKey, '{not json');
    final state = _state(store);
    await state.load();
    expect(state.cartLines, isEmpty);
  });

  test('placing an order keeps it, empties the cart and continues the reference series', () async {
    final store = MemoryStore();
    final state = _state(store);
    await state.addToCart(_tee, quantity: 2);

    final first = await state.placeOrder(
      address: _address,
      note: 'Call before delivery',
      quote: const DeliveryQuote(feeKs: 2500, service: 'MH Delivery', etaDays: '1-2', source: 'table'),
      now: DateTime.utc(2026, 11, 25, 10),
    );

    expect(first.reference, 'MH2000');
    expect(first.subtotalKs, 24000);
    expect(first.totalKs, 26500);
    expect(state.cartLines, isEmpty);
    expect(state.orders, hasLength(1));
    expect(first.summary, contains('2 × Classic Tee'));
    expect(first.summary, contains('Call before delivery'));

    final restored = _state(store);
    await restored.load();
    expect(restored.orders, hasLength(1));
    expect(restored.orders.first.reference, 'MH2000');
    expect(restored.orders.first.address.township, 'Mingalar Taung Nyunt');
  });

  test('the wishlist toggles and is remembered', () async {
    final store = MemoryStore();
    final state = _state(store);
    expect(await state.toggleWishlist('p-1'), isTrue);
    expect(state.isWished('p-1'), isTrue);
    expect(await state.toggleWishlist('p-1'), isFalse);
    expect(state.isWished('p-1'), isFalse);

    await state.toggleWishlist('p-2');
    final restored = _state(store);
    await restored.load();
    expect(restored.isWished('p-2'), isTrue);
  });

  test('the language and the currency are remembered', () async {
    final store = MemoryStore();
    final state = _state(store);
    await state.setLocale('my');
    await state.setCurrency('USD');
    expect(state.s.get('cart'), 'ဈေးခြင်း');

    final restored = _state(store);
    await restored.load();
    expect(restored.locale, 'my');
    expect(restored.currency, 'USD');
  });

  test('an address names every field it is missing in one pass', () {
    const empty = DeliveryAddress(name: '', phone: '', address: '', township: '', city: '');
    expect(empty.missing, ['name', 'phone', 'address', 'township', 'city']);
    expect(_address.missing, isEmpty);
  });

  test('an order line and an address survive the JSON round trip', () {
    const OrderLine line = OrderLine(product: _tee, quantity: 2);
    final restored = OrderLine.fromJson(line.toJson());
    expect(restored?.product.id, 'p-1');
    expect(restored?.quantity, 2);
    expect(restored?.totalKs, 24000);

    final address = DeliveryAddress.fromJson(_address.toJson());
    expect(address?.city, 'Yangon');
    expect(address?.phone, '+95 9 449 330 127');
  });
}
