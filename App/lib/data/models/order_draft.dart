import 'product.dart';

/// One line the customer is buying: the product, how many, and the price it was when it was added.
class OrderLine {
  const OrderLine({required this.product, required this.quantity});

  final Product product;
  final int quantity;

  int get totalKs => product.displayPriceKs * quantity;

  Map<String, Object?> toJson() => {'product': product.toJson(), 'quantity': quantity};

  static OrderLine? fromJson(Map<String, Object?> json) {
    final productJson = json['product'];
    if (productJson is! Map<String, Object?>) return null;
    final product = Product.fromJson(productJson);
    if (product == null) return null;
    final quantity = json['quantity'];
    return OrderLine(product: product, quantity: quantity is int ? quantity : 1);
  }
}

/// The address the parcel goes to, typed once per order.
class DeliveryAddress {
  const DeliveryAddress({
    required this.name,
    required this.phone,
    required this.address,
    required this.township,
    required this.city,
  });

  final String name;
  final String phone;
  final String address;
  final String township;
  final String city;

  List<String> get missing => [
        if (name.trim().isEmpty) 'name',
        if (phone.trim().isEmpty) 'phone',
        if (address.trim().isEmpty) 'address',
        if (township.trim().isEmpty) 'township',
        if (city.trim().isEmpty) 'city',
      ];

  Map<String, Object?> toJson() => {
        'name': name,
        'phone': phone,
        'address': address,
        'township': township,
        'city': city,
      };

  static DeliveryAddress? fromJson(Map<String, Object?> json) {
    String read(String key) => json[key] is String ? json[key]! as String : '';
    return DeliveryAddress(
      name: read('name'),
      phone: read('phone'),
      address: read('address'),
      township: read('township'),
      city: read('city'),
    );
  }
}

/// An order this phone placed. The app keeps it locally until the site has an order endpoint; the
/// shop receives the same text through the share sheet.
class PlacedOrder {
  const PlacedOrder({
    required this.reference,
    required this.placedAt,
    required this.lines,
    required this.address,
    required this.deliveryFeeKs,
    required this.note,
  });

  final String reference;
  final DateTime placedAt;
  final List<OrderLine> lines;
  final DeliveryAddress address;
  final int deliveryFeeKs;
  final String note;

  int get subtotalKs => lines.fold(0, (sum, line) => sum + line.totalKs);

  int get totalKs => subtotalKs + deliveryFeeKs;

  String get summary {
    final buffer = StringBuffer('$reference — ${lines.length} line(s)\n');
    for (final line in lines) {
      buffer.writeln('${line.quantity} × ${line.product.name} — ${line.totalKs} Ks');
    }
    buffer.writeln('Delivery: $deliveryFeeKs Ks');
    buffer.writeln('Total: $totalKs Ks');
    buffer.writeln('To: ${address.name}, ${address.phone}');
    buffer.writeln('${address.address}, ${address.township}, ${address.city}');
    if (note.trim().isNotEmpty) buffer.writeln('Note: $note');
    return buffer.toString();
  }

  Map<String, Object?> toJson() => {
        'reference': reference,
        'placed_at': placedAt.toUtc().toIso8601String(),
        'lines': lines.map((line) => line.toJson()).toList(),
        'address': address.toJson(),
        'delivery_fee_ks': deliveryFeeKs,
        'note': note,
      };

  static PlacedOrder? fromJson(Map<String, Object?> json) {
    final reference = json['reference'];
    final placedAt = json['placed_at'];
    final addressJson = json['address'];
    final linesJson = json['lines'];
    if (reference is! String || placedAt is! String || addressJson is! Map<String, Object?> || linesJson is! List<Object?>) {
      return null;
    }
    final parsedAt = DateTime.tryParse(placedAt);
    final address = DeliveryAddress.fromJson(addressJson);
    if (parsedAt == null || address == null) return null;
    final lines = <OrderLine>[];
    for (final entry in linesJson) {
      if (entry is Map<String, Object?>) {
        final line = OrderLine.fromJson(entry);
        if (line != null) lines.add(line);
      }
    }
    if (lines.isEmpty) return null;
    return PlacedOrder(
      reference: reference,
      placedAt: parsedAt,
      lines: lines,
      address: address,
      deliveryFeeKs: json['delivery_fee_ks'] is int ? json['delivery_fee_ks']! as int : 0,
      note: json['note'] is String ? json['note']! as String : '',
    );
  }
}
