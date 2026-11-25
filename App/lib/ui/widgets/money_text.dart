import 'package:material_ui/material_ui.dart';

import '../../core/format.dart';
import '../app_scope.dart';

/// A price in the currency the customer chose: kyat by default, dollars at the admin's rate.
class MoneyText extends StatelessWidget {
  const MoneyText(this.amountKs, {super.key, this.minKs, this.style});

  final num amountKs;
  final int? minKs;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final text = minKs == null
        ? (state.currency == 'USD'
            ? formatUsd(amountKs, usdRateKs: state.usdRateKs)
            : formatKs(amountKs, locale: state.locale))
        : formatPriceRange(minKs!, amountKs.round(), locale: state.locale, currency: state.currency, usdRateKs: state.usdRateKs);
    return Text(text, style: style ?? const TextStyle(fontWeight: FontWeight.w700, fontSize: 15));
  }
}
