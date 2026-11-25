import 'package:shared_preferences/shared_preferences.dart';

/// The few strings the app keeps between launches. An interface, so a test never touches a device.
abstract class KeyValueStore {
  Future<String?> read(String key);

  Future<void> write(String key, String value);
}

class SharedPreferencesStore implements KeyValueStore {
  @override
  Future<String?> read(String key) async => (await SharedPreferences.getInstance()).getString(key);

  @override
  Future<void> write(String key, String value) async {
    await (await SharedPreferences.getInstance()).setString(key, value);
  }
}

class MemoryStore implements KeyValueStore {
  final Map<String, String> values = {};

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async => values[key] = value;
}
