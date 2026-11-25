import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/theme.dart';
import '../../data/models/delivery_quote.dart';
import '../../data/models/order_draft.dart';
import '../app_scope.dart';
import '../widgets/money_text.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final TextEditingController _name = TextEditingController();
  final TextEditingController _phone = TextEditingController();
  final TextEditingController _address = TextEditingController();
  final TextEditingController _township = TextEditingController();
  final TextEditingController _city = TextEditingController(text: 'Yangon');
  final TextEditingController _note = TextEditingController();

  DeliveryQuote? _quote;
  bool _quoting = false;
  String? _error;
  bool _placing = false;

  @override
  void dispose() {
    for (final controller in <TextEditingController>[_name, _phone, _address, _township, _city, _note]) {
      controller.dispose();
    }
    super.dispose();
  }

  DeliveryAddress get _deliveryAddress => DeliveryAddress(
        name: _name.text,
        phone: _phone.text,
        address: _address.text,
        township: _township.text,
        city: _city.text,
      );

  Future<void> _fetchQuote() async {
    final state = AppScope.read(context);
    if (state.cartCount == 0) return;
    setState(() {
      _quoting = true;
      _error = null;
    });
    final quote = await state.delivery.quote(
      city: _city.text,
      township: _township.text,
      units: state.cartCount,
      subtotalKs: state.subtotalKs,
    );
    if (!mounted) return;
    setState(() {
      _quote = quote;
      _quoting = false;
    });
  }

  Future<void> _place() async {
    final state = AppScope.read(context);
    final missing = _deliveryAddress.missing;
    if (missing.isNotEmpty) {
      setState(() => _error = '${state.s.get('required')}: ${missing.join(', ')}');
      return;
    }
    setState(() {
      _placing = true;
      _error = null;
    });
    final quote = _quote ??
        await state.delivery.quote(
          city: _city.text,
          township: _township.text,
          units: state.cartCount,
          subtotalKs: state.subtotalKs,
        );
    if (!mounted) return;
    final order = await state.placeOrder(address: _deliveryAddress, note: _note.text, quote: quote);
    if (!mounted) return;
    setState(() => _placing = false);
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(state.s.get('orderPlaced')),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(order.reference, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: kAccent)),
              const SizedBox(height: 8),
              Text(order.summary),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: order.summary));
              if (!dialogContext.mounted) return;
              Navigator.of(dialogContext).pop();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.s.get('copied'))));
            },
            child: Text(state.s.get('copyOrder')),
          ),
          FilledButton(onPressed: () => Navigator.of(dialogContext).pop(), child: const Text('OK')),
        ],
      ),
    );
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final quote = _quote;
    return Scaffold(
      appBar: AppBar(title: Text(state.s.get('checkout'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(state.s.get('deliveryAddress'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          _field(_name, state.s.get('name'), TextInputType.name),
          const SizedBox(height: 10),
          _field(_phone, state.s.get('phone'), TextInputType.phone),
          const SizedBox(height: 10),
          _field(_address, state.s.get('address'), TextInputType.streetAddress),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _field(_township, state.s.get('township'), TextInputType.text, onChanged: (_) => _fetchQuote())),
              const SizedBox(width: 10),
              Expanded(child: _field(_city, state.s.get('city'), TextInputType.text, onChanged: (_) => _fetchQuote())),
            ],
          ),
          const SizedBox(height: 10),
          _field(_note, state.s.get('note'), TextInputType.multiline),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Text(state.s.get('subtotal'), style: const TextStyle(color: kMuted)),
                      const Spacer(),
                      MoneyText(state.subtotalKs),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(state.s.get('delivery'), style: const TextStyle(color: kMuted)),
                      const Spacer(),
                      if (_quoting)
                        const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: kAccent))
                      else
                        MoneyText(quote?.feeKs ?? 0),
                    ],
                  ),
                  if (quote != null && quote.fromTable) ...[
                    const SizedBox(height: 6),
                    Text(state.s.get('quoteFailed'), style: const TextStyle(color: kMuted, fontSize: 12)),
                  ],
                  if (quote != null && quote.etaDays.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text('${quote.service} · ${quote.etaDays}', style: const TextStyle(color: kMuted, fontSize: 12)),
                  ],
                  const Divider(height: 24),
                  Row(
                    children: [
                      Text(state.s.get('total'), style: const TextStyle(fontWeight: FontWeight.w700)),
                      const Spacer(),
                      MoneyText(
                        state.subtotalKs + (quote?.feeKs ?? 0),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kAccent),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Color(0xFFFF6B6B))),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _placing || state.cartLines.isEmpty ? null : _place,
            child: _placing
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                : Text(state.s.get('placeOrder')),
          ),
          const SizedBox(height: 12),
          Text(state.s.get('payAtShop'), textAlign: TextAlign.center, style: const TextStyle(color: kMuted, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label,
    TextInputType keyboard, {
    ValueChanged<String>? onChanged,
  }) =>
      TextField(
        controller: controller,
        keyboardType: keyboard,
        onChanged: onChanged,
        decoration: InputDecoration(labelText: label),
      );
}
