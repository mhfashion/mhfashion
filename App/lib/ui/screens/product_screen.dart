import 'package:material_ui/material_ui.dart';

import '../../core/theme.dart';
import '../../data/models/product.dart';
import '../app_scope.dart';
import '../widgets/money_text.dart';

class ProductScreen extends StatelessWidget {
  const ProductScreen({super.key, required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final wished = state.isWished(product.id);
    return Scaffold(
      appBar: AppBar(
        title: Text(product.name, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            onPressed: () async {
              final added = await state.toggleWishlist(product.id);
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('${state.s.get('wishlist')} · ${added ? "+" : "−"}')),
              );
            },
            icon: Icon(wished ? Icons.favorite : Icons.favorite_border, color: wished ? kAccent : null),
          ),
        ],
      ),
      body: ListView(
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: product.imageUrl == null || product.imageUrl!.isEmpty
                ? const ColoredBox(
                    color: kSurface,
                    child: Icon(Icons.checkroom, size: 96, color: kMuted),
                  )
                : Image.network(product.imageUrl!, fit: BoxFit.cover),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                MoneyText(
                  product.displayPriceKs,
                  minKs: product.priceMinKs,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: kAccent),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (product.subBrand != null) _Tag(product.subBrand!),
                    if (product.productType != null) _Tag(product.productType!),
                    if (product.isCustomizable != null) _Tag('${product.isCustomizable} print'),
                    if (product.isNew) const _Tag('New'),
                  ],
                ),
                const SizedBox(height: 20),
                Text(state.s.get('payAtShop'), style: const TextStyle(color: kMuted, height: 1.5)),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.all(16),
        child: FilledButton.icon(
          onPressed: () async {
            await state.addToCart(product);
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.s.get('addedToCart'))));
          },
          icon: const Icon(Icons.shopping_bag_outlined),
          label: Text(state.inCart(product.id) ? '${state.s.get('inCart')} · ${state.quantityOf(product.id)}' : state.s.get('addToCart')),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: kLine),
          color: kSurface,
        ),
        child: Text(label, style: const TextStyle(fontSize: 12, color: kMuted)),
      );
}
