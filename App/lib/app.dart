import 'package:material_ui/material_ui.dart';

import 'core/theme.dart';
import 'state/app_state.dart';
import 'ui/app_scope.dart';
import 'ui/screens/account_screen.dart';
import 'ui/screens/cart_screen.dart';
import 'ui/screens/catalog_screen.dart';
import 'ui/screens/home_screen.dart';

class MhFashionApp extends StatefulWidget {
  const MhFashionApp({super.key, required this.state});

  final AppState state;

  @override
  State<MhFashionApp> createState() => _MhFashionAppState();
}

class _MhFashionAppState extends State<MhFashionApp> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    return AppScope(
      state: widget.state,
      child: MaterialApp(
        title: 'MH Fashion',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        home: Builder(
          builder: (context) {
            final state = AppScope.of(context);
            return Scaffold(
              body: IndexedStack(
                index: _tab,
                children: <Widget>[
                  HomeScreen(onShopAll: () => setState(() => _tab = 1)),
                  const CatalogScreen(),
                  CartScreen(onShop: () => setState(() => _tab = 1)),
                  const AccountScreen(),
                ],
              ),
              bottomNavigationBar: NavigationBar(
                selectedIndex: _tab,
                onDestinationSelected: (index) => setState(() => _tab = index),
                destinations: <NavigationDestination>[
                  NavigationDestination(
                    icon: const Icon(Icons.home_outlined),
                    selectedIcon: const Icon(Icons.home),
                    label: state.s.get('home'),
                  ),
                  NavigationDestination(
                    icon: const Icon(Icons.grid_view_outlined),
                    selectedIcon: const Icon(Icons.grid_view),
                    label: state.s.get('shop'),
                  ),
                  NavigationDestination(
                    icon: Badge(
                      isLabelVisible: state.cartCount > 0,
                      backgroundColor: kAccent,
                      label: Text('${state.cartCount}', style: const TextStyle(color: Colors.black)),
                      child: const Icon(Icons.shopping_bag_outlined),
                    ),
                    selectedIcon: const Icon(Icons.shopping_bag),
                    label: state.s.get('cart'),
                  ),
                  NavigationDestination(
                    icon: const Icon(Icons.person_outline),
                    selectedIcon: const Icon(Icons.person),
                    label: state.s.get('account'),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
