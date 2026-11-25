import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mh_fashion/app.dart';
import 'package:mh_fashion/data/catalog_repository.dart';
import 'package:mh_fashion/data/delivery_repository.dart';
import 'package:mh_fashion/data/models/product.dart';
import 'package:mh_fashion/data/storage.dart';
import 'package:mh_fashion/state/app_state.dart';
import 'package:mh_fashion/ui/screens/catalog_screen.dart';
import 'package:mh_fashion/ui/widgets/product_card.dart';

class _FakeCatalog implements CatalogRepository {
  _FakeCatalog(this.items);

  final List<Product> items;

  @override
  Future<List<Product>> newArrivals({int limit = 8}) async => items.take(limit).toList();

  @override
  Future<List<Product>> products({String? search, String? subBrand, int limit = 60}) async {
    final term = (search ?? '').toLowerCase();
    return items
        .where((product) => term.isEmpty || product.name.toLowerCase().contains(term))
        .where((product) => subBrand == null || product.subBrand == subBrand)
        .take(limit)
        .toList();
  }

  @override
  Future<Product?> productBySlug(String slug) async {
    for (final product in items) {
      if (product.slug == slug) return product;
    }
    return null;
  }
}

const List<Product> _catalog = <Product>[
  Product(id: 'p-1', name: 'Classic Tee', slug: 'classic-tee', priceMinKs: 12000, priceMaxKs: 12000, isNew: true),
  Product(id: 'p-2', name: 'Street Hoodie', slug: 'street-hoodie', priceMinKs: 30000, priceMaxKs: 36000, subBrand: 'Streetwear'),
];

Future<AppState> _pump(WidgetTester tester) async {
  final state = AppState(
    catalog: _FakeCatalog(_catalog),
    delivery: const TableDeliveryRepository(),
    store: MemoryStore(),
  );
  await state.load();
  await tester.pumpWidget(MhFashionApp(state: state));
  await tester.pumpAndSettle();
  return state;
}

void main() {
  testWidgets('the home tab shows the new arrivals from the catalogue', (tester) async {
    await _pump(tester);

    expect(find.text('MH Fashion'), findsOneWidget);
    expect(find.text('New arrivals'), findsOneWidget);
    expect(find.text('Classic Tee'), findsWidgets);
  });

  testWidgets('a product can be added to the cart and shows in the cart tab', (tester) async {
    final state = await _pump(tester);

    await tester.tap(find.text('Classic Tee').first);
    await tester.pumpAndSettle();
    expect(find.text('Add to cart'), findsOneWidget);

    await tester.tap(find.text('Add to cart'));
    await tester.pumpAndSettle();
    expect(state.cartCount, 1);

    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cart'));
    await tester.pumpAndSettle();
    expect(find.text('Subtotal'), findsOneWidget);
    expect(find.text('12,000 Ks'), findsWidgets);
  });

  testWidgets('an empty cart says so', (tester) async {
    await _pump(tester);
    await tester.tap(find.text('Cart'));
    await tester.pumpAndSettle();
    expect(find.text('Your cart is empty.'), findsOneWidget);
  });

  testWidgets('the account tab carries the language and currency switches', (tester) async {
    final state = await _pump(tester);
    await tester.tap(find.text('Account'));
    await tester.pumpAndSettle();

    expect(find.text('Language'), findsOneWidget);
    expect(find.text('Currency'), findsOneWidget);

    await tester.tap(find.text('မြန်မာ'));
    await tester.pumpAndSettle();
    expect(state.locale, 'my');
    expect(find.text('ဈေးခြင်း'), findsWidgets);
  });

  testWidgets('the shop tab filters by a typed term', (tester) async {
    await _pump(tester);
    await tester.tap(find.text('Shop'));
    await tester.pumpAndSettle();

    Finder cards() => find.descendant(of: find.byType(CatalogScreen), matching: find.byType(ProductCard));
    expect(cards(), findsNWidgets(2));

    await tester.enterText(find.byType(TextField).first, 'hoodie');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();

    expect(cards(), findsOneWidget);
    expect(find.descendant(of: find.byType(CatalogScreen), matching: find.text('Street Hoodie')), findsOneWidget);
  });
}
