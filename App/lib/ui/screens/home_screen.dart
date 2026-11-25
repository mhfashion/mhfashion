import 'package:material_ui/material_ui.dart';

import '../../core/theme.dart';
import '../../data/models/product.dart';
import '../app_scope.dart';
import '../widgets/product_card.dart';
import 'product_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onShopAll});

  final VoidCallback onShopAll;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<Product>> _arrivals;

  @override
  void initState() {
    super.initState();
    _arrivals = AppScope.read(context).catalog.newArrivals(limit: 8);
  }

  Future<void> _reload() async {
    final future = AppScope.of(context).catalog.newArrivals(limit: 8);
    setState(() {
      _arrivals = future;
    });
    await future;
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(state.s.get('appTitle')),
        actions: [
          TextButton(
            onPressed: () => state.setLocale(state.locale == 'en' ? 'my' : 'en'),
            child: Text(state.locale == 'en' ? 'EN / မြန်မာ' : 'မြန်မာ / EN', style: const TextStyle(color: kAccent)),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: kAccent,
        onRefresh: _reload,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            const _Hero(),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: Text(state.s.get('newArrivals'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                ),
                TextButton(onPressed: widget.onShopAll, child: Text(state.s.get('allProducts'))),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 260,
              child: FutureBuilder<List<Product>>(
                future: _arrivals,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator(color: kAccent));
                  }
                  if (snapshot.hasError || (snapshot.data?.isEmpty ?? true)) {
                    return _Notice(
                      message: snapshot.hasError ? state.s.get('catalogueOffline') : state.s.get('noResults'),
                      onRetry: _reload,
                    );
                  }
                  final products = snapshot.data!;
                  return ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: products.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      final product = products[index];
                      return SizedBox(
                        width: 168,
                        child: ProductCard(
                          product: product,
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(builder: (_) => ProductScreen(product: product)),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 24),
            Card(
              child: ListTile(
                leading: const Icon(Icons.local_shipping_outlined, color: kAccent),
                title: Text(state.s.get('delivery')),
                subtitle: Text(state.s.get('payAtShop')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero();

  @override
  Widget build(BuildContext context) => Container(
        height: 168,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          gradient: const LinearGradient(colors: [Color(0xFF2C5A10), kAccent], begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Text('MH FASHION', style: TextStyle(fontSize: 12, letterSpacing: 3, fontWeight: FontWeight.w800, color: Colors.black54)),
            SizedBox(height: 6),
            Text('Wear your own design', style: TextStyle(fontSize: 24, height: 1.15, fontWeight: FontWeight.w800, color: Colors.black)),
            SizedBox(height: 4),
            Text('Print on demand · Yangon', style: TextStyle(color: Colors.black87)),
          ],
        ),
      );
}

class _Notice extends StatelessWidget {
  const _Notice({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: kMuted)),
            ),
            TextButton(onPressed: onRetry, child: Text(AppScope.of(context).s.get('retry'))),
          ],
        ),
      );
}
