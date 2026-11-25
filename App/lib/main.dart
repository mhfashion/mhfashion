import 'package:material_ui/material_ui.dart';

import 'app.dart';
import 'core/config.dart';
import 'data/catalog_repository.dart';
import 'data/delivery_repository.dart';
import 'data/storage.dart';
import 'state/app_state.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const AppConfig config = AppConfig.fromEnvironment;
  final AppState state = AppState(
    catalog: config.hasCatalogue ? SupabaseCatalogRepository(config: config) : const EmptyCatalogRepository(),
    delivery: config.hasSite ? SiteDeliveryRepository(config: config) : const TableDeliveryRepository(),
    store: SharedPreferencesStore(),
  );
  await state.load();
  runApp(MhFashionApp(state: state));
}
