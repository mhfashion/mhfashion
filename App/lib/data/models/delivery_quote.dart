/// What `POST /api/delivery/quote` answers on the site (`apps/web/src/lib/delivery-quote.ts`):
/// always a fee, and `source` says whether the courier or the shop's own table priced it.
class DeliveryQuote {
  const DeliveryQuote({
    required this.feeKs,
    required this.service,
    required this.etaDays,
    required this.source,
    this.weightGrams = 0,
    this.note,
  });

  final int feeKs;
  final String service;
  final String etaDays;
  final String source;
  final int weightGrams;
  final String? note;

  bool get fromTable => source == 'table';

  static DeliveryQuote? fromJson(Map<String, Object?> json) {
    final fee = json['feeKs'];
    if (fee is! num) return null;
    return DeliveryQuote(
      feeKs: fee.round(),
      service: json['service'] is String ? json['service']! as String : 'MH Delivery',
      etaDays: json['etaDays'] is String ? json['etaDays']! as String : '',
      source: json['source'] is String ? json['source']! as String : 'table',
      weightGrams: json['weightGrams'] is num ? (json['weightGrams']! as num).round() : 0,
      note: json['note'] is String ? json['note']! as String : null,
    );
  }

  Map<String, Object?> toJson() => {
        'feeKs': feeKs,
        'service': service,
        'etaDays': etaDays,
        'source': source,
        'weightGrams': weightGrams,
        'note': note,
      };
}
