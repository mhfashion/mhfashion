import 'package:material_ui/material_ui.dart';

import '../../core/theme.dart';
import '../app_scope.dart';
import '../widgets/money_text.dart';
import 'checkout_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key, required this.onShop});

  final VoidCallback onShop;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lines = state.cartLines;
    return Scaffold(
      appBar: AppBar(title: Text(state.s.get('cart'))),
      body: lines.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.shopping_bag_outlined, size: 56, color: kMuted),
                  const SizedBox(height: 12),
                  Text(state.s.get('emptyCart'), style: const TextStyle(color: kMuted)),
                  const SizedBox(height: 8),
                  TextButton(onPressed: onShop, child: Text(state.s.get('allProducts'))),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: lines.length,
              separatorBuilder: (_, _) => const Divider(height: 24),
              itemBuilder: (context, index) {
                final line = lines[index];
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: SizedBox(
                        width: 72,
                        height: 72,
                        child: line.product.imageUrl == null
                            ? const ColoredBox(color: kSurface, child: Icon(Icons.checkroom, color: kMuted))
                            : Image.network(line.product.imageUrl!, fit: BoxFit.cover),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(line.product.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          MoneyText(line.totalKs),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                onPressed: () => state.setQuantity(line.product.id, line.quantity - 1),
                                icon: const Icon(Icons.remove_circle_outline),
                              ),
                              Text('${line.quantity}', style: const TextStyle(fontWeight: FontWeight.w700)),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                onPressed: () => state.setQuantity(line.product.id, line.quantity + 1),
                                icon: const Icon(Icons.add_circle_outline),
                              ),
                              const Spacer(),
                              TextButton(
                                onPressed: () => state.removeFromCart(line.product.id),
                                child: Text(state.s.get('remove')),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
      bottomNavigationBar: lines.isEmpty
          ? null
          : SafeArea(
              minimum: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Text(state.s.get('subtotal'), style: const TextStyle(color: kMuted)),
                      const Spacer(),
                      MoneyText(state.subtotalKs, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => const CheckoutScreen()),
                    ),
                    child: Text(state.s.get('checkout')),
                  ),
                ],
              ),
            ),
    );
  }
}
