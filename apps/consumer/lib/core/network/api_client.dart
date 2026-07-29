import 'dart:convert';
import 'package:http/http.dart' as http;
import '../storage/secure_storage.dart';

class ApiClient {
  final SecureStorage secureStorage;
  final String baseUrl;

  ApiClient({
    required this.secureStorage,
    required this.baseUrl,
  });

  Future<Map<String, String>> _buildHeaders() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'x-tenant-id': '11111111-1111-4111-8111-111111111111',
    };
    final token = await secureStorage.getAccessToken();
    if (token != null) {
      if (token.contains('.') && token.length > 50) {
        headers['Authorization'] = 'Bearer $token';
      } else {
        headers['x-user-id'] = token;
      }
    }
    return headers;
  }

  Future<http.Response> get(String path) async {
    final headers = await _buildHeaders();
    return http.get(Uri.parse('$baseUrl$path'), headers: headers);
  }

  Future<http.Response> post(String path, {Object? body}) async {
    final headers = await _buildHeaders();
    return http.post(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
  }
}

