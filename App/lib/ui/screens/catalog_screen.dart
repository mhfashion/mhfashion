import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../../core/theme.dart';
import '../../data/models/product.dart';
import '../app_scope.dart';
import '../widgets/product_card.dart';
import 'product_screen.dart';

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key});

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  static const List<String> _brands = ['Sticker', 'Singular', 'Kids', 'Streetwear', 'Sport', 'Accessories'];

  final TextEditingController _search = TextEditingController();
  Timer? _debounce;
  String? _brand;
  late Future<List<Product>> _products;

  @override
  void initState() {
    super.initState();
    _products = _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<List<Product>> _load() {
    final state = AppScope.read(context);
    return state.catalog.products(search: _search.text, subBrand: _brand, limit: 60);
  }

  void _refresh() {
    setState(() {
      _products = _load();
    });
  }

  void _onSearchChanged(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), _refresh);
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(state.s.get('allProducts'))),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: TextField(
              controller: _search,
              onChanged: _onSearchChanged,
              onSubmitted: (_) => _refresh(),
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: state.s.get('searchHint'),
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _search.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () {
                          _search.clear();
                          _refresh();
                        },
                      ),
              ),
            ),
          ),
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                for (final brand in _brands)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: FilterChip(
                      label: Text(brand),
                      selected: _brand == brand,
                      selectedColor: kAccent.withValues(alpha: 0.25),
                      onSelected: (selected) {
                        setState(() => _brand = selected ? brand : null);
                        _refresh();
                      },
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Product>>(
              future: _products,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: kAccent));
                }
                if (snapshot.hasError) {
                  return _Error(message: state.s.get('catalogueOffline'), onRetry: _refresh);
                }
                final products = snapshot.data ?? const <Product>[];
                if (products.isEmpty) {
                  return _Error(message: state.s.get('noResults'), onRetry: _refresh);
                }
                return GridView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.62,
                  ),
                  itemCount: products.length,
                  itemBuilder: (context, index) {
                    final product = products[index];
                    return ProductCard(
                      product: product,
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => ProductScreen(product: product)),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _Error extends StatelessWidget {
  const _Error({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: kMuted)),
            ),
            TextButton(onPressed: onRetry, child: Text(AppScope.of(context).s.get('retry'))),
          ],
        ),
      );
}
