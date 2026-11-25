import 'package:material_ui/material_ui.dart';

import '../../core/format.dart';
import '../../core/theme.dart';
import '../../data/models/product.dart';
import '../app_scope.dart';
import '../widgets/money_text.dart';
import 'product_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  late Future<List<Product>> _wished;

  @override
  void initState() {
    super.initState();
    _wished = _loadWishlist();
  }

  Future<List<Product>> _loadWishlist() async {
    final state = AppScope.read(context);
    if (state.wishlist.isEmpty) return const <Product>[];
    final all = await state.catalog.products(limit: 60);
    return all.where((product) => state.wishlist.contains(product.id)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(state.s.get('account'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(state.s.get('settings'), style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Text(state.s.get('language'), style: const TextStyle(color: kMuted, fontSize: 12)),
                  const SizedBox(height: 6),
                  SegmentedButton<String>(
                    segments: const <ButtonSegment<String>>[
                      ButtonSegment<String>(value: 'en', label: Text('English')),
                      ButtonSegment<String>(value: 'my', label: Text('မြန်မာ')),
                    ],
                    selected: <String>{state.locale},
                    onSelectionChanged: (value) => state.setLocale(value.first),
                  ),
                  const SizedBox(height: 16),
                  Text(state.s.get('currency'), style: const TextStyle(color: kMuted, fontSize: 12)),
                  const SizedBox(height: 6),
                  SegmentedButton<String>(
                    segments: const <ButtonSegment<String>>[
                      ButtonSegment<String>(value: 'Ks', label: Text('Ks')),
                      ButtonSegment<String>(value: 'USD', label: Text(r'$')),
                    ],
                    selected: <String>{state.currency},
                    onSelectionChanged: (value) => state.setCurrency(value.first),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(state.s.get('myOrders'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          if (state.orders.isEmpty)
            Text(state.s.get('emptyOrders'), style: const TextStyle(color: kMuted))
          else
            for (final order in state.orders)
              Card(
                child: ListTile(
                  title: Text('${order.reference} · ${formatYangonDate(order.placedAt, locale: state.locale)}'),
                  subtitle: Text(order.lines.map((line) => '${line.quantity} × ${line.product.name}').join(', ')),
                  trailing: MoneyText(order.totalKs),
                ),
              ),
          const SizedBox(height: 20),
          Text(state.s.get('wishlist'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          FutureBuilder<List<Product>>(
            future: _wished,
            builder: (context, snapshot) {
              final products = snapshot.data ?? const <Product>[];
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator(color: kAccent));
              }
              if (products.isEmpty) {
                return Text(state.s.get('emptyWishlist'), style: const TextStyle(color: kMuted));
              }
              return Column(
                children: [
                  for (final product in products)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(product.name),
                      subtitle: MoneyText(product.displayPriceKs),
                      trailing: IconButton(
                        icon: const Icon(Icons.favorite, color: kAccent),
                        onPressed: () async {
                          await state.toggleWishlist(product.id);
                          if (!mounted) return;
                          setState(() {
                            _wished = _loadWishlist();
                          });
                        },
                      ),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => ProductScreen(product: product)),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 24),
          Text(state.s.get('aboutShop'), textAlign: TextAlign.center, style: const TextStyle(color: kMuted, fontSize: 12)),
        ],
      ),
    );
  }
}
