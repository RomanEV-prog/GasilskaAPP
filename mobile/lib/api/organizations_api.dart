import 'api_client.dart';

/// Podatki o mojem društvu (samo branje v mobilni).
class OrganizationsApi {
  final _client = ApiClient.instance;

  /// GET /organizations/me — dostopno vsem prijavljenim članom.
  Future<Map<String, dynamic>> me() async {
    final data = await _client.get('/organizations/me');
    return data as Map<String, dynamic>;
  }
}
