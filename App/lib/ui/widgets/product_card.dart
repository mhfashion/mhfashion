import 'package:material_ui/material_ui.dart';

import '../../core/theme.dart';
import '../../data/models/product.dart';
import '../app_scope.dart';
import 'money_text.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, required this.onTap});

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final wished = state.isWished(product.id);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  _Photo(url: product.imageUrl),
                  if (product.isNew)
                    const Positioned(
                      left: 10,
                      top: 10,
                      child: _Chip(label: 'NEW'),
                    ),
                  Positioned(
                    right: 4,
                    top: 4,
                    child: IconButton(
                      tooltip: state.s.get('wishlist'),
                      onPressed: () => state.toggleWishlist(product.id),
                      icon: Icon(wished ? Icons.favorite : Icons.favorite_border, color: wished ? kAccent : Colors.white70),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, height: 1.25),
                  ),
                  const SizedBox(height: 4),
                  MoneyText(product.displayPriceKs, minKs: product.priceMinKs, style: const TextStyle(color: kAccent, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Photo extends StatelessWidget {
  const _Photo({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      color: kSurface,
      alignment: Alignment.center,
      child: const Icon(Icons.checkroom, size: 42, color: kMuted),
    );
    if (url == null || url!.isEmpty) return placeholder;
    return Image.network(
      url!,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => placeholder,
      loadingBuilder: (context, child, progress) => progress == null ? child : placeholder,
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: kAccent, borderRadius: BorderRadius.circular(999)),
        child: Text(label, style: const TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.6)),
      );
}
