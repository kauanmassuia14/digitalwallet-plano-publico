import 'dart:convert';
import 'package:http/http.dart' as http;
import '../domain/collection_models.dart';
import '../../../core/storage/secure_storage.dart';

class CollectionRepository {
  final SecureStorage secureStorage;
  final String baseUrl;

  CollectionRepository({
    required this.secureStorage,
    this.baseUrl = 'https://breath-plus-charles-charlie.trycloudflare.com/api/v1',
  });

  Future<Map<String, String>> _headers() async {
    final tenantId = await secureStorage.getTenantId() ??
        '11111111-1111-4111-8111-111111111111';
    final userId = await secureStorage.getUserId() ??
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    return {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'x-user-id': userId,
    };
  }

  // ─── Collection Requests ──────────────────────────────────────────────

  Future<List<CollectionRequest>> listRequests({
    String? condominiumId,
    String? cooperativeId,
    String? status,
  }) async {
    final headers = await _headers();
    final params = <String, String>{};
    if (condominiumId != null) params['condominiumId'] = condominiumId;
    if (cooperativeId != null) params['cooperativeId'] = cooperativeId;
    if (status != null) params['status'] = status;

    final uri = Uri.parse('$baseUrl/collections/requests')
        .replace(queryParameters: params.isNotEmpty ? params : null);

    final response = await http.get(uri, headers: headers);
    if (response.statusCode != 200) {
      throw Exception('Failed to load requests: ${response.statusCode}');
    }

    final List<dynamic> data = jsonDecode(response.body) as List<dynamic>;
    return data
        .map((e) => CollectionRequest.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<CollectionRequest> getRequest(String requestId) async {
    final headers = await _headers();
    final response = await http.get(
      Uri.parse('$baseUrl/collections/requests/$requestId'),
      headers: headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to load request: ${response.statusCode}');
    }
    return CollectionRequest.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<CollectionRequest> createRequest({
    required String condominiumId,
    DateTime? scheduledFor,
  }) async {
    final headers = await _headers();
    final body = jsonEncode({
      'condominiumId': condominiumId,
      if (scheduledFor != null) 'scheduledFor': scheduledFor.toIso8601String(),
    });

    final response = await http.post(
      Uri.parse('$baseUrl/collections/requests'),
      headers: headers,
      body: body,
    );
    if (response.statusCode != 201) {
      throw Exception('Failed to create request: ${response.statusCode}');
    }
    return CollectionRequest.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<CollectionRequest?> acceptRequest(String cooperativeId) async {
    final headers = await _headers();
    final body = jsonEncode({'cooperativeId': cooperativeId});

    final response = await http.post(
      Uri.parse('$baseUrl/collections/match'),
      headers: headers,
      body: body,
    );
    if (response.statusCode == 200 && response.body != 'null') {
      return CollectionRequest.fromJson(
          jsonDecode(response.body) as Map<String, dynamic>);
    }
    return null;
  }

  Future<CollectionRequest> completeRequest(String requestId) async {
    final headers = await _headers();
    final response = await http.post(
      Uri.parse('$baseUrl/collections/requests/$requestId/complete'),
      headers: headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to complete request: ${response.statusCode}');
    }
    return CollectionRequest.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>);
  }

  // ─── Chat ─────────────────────────────────────────────────────────────

  Future<List<ChatMessage>> getMessages(
    String requestId, {
    DateTime? after,
  }) async {
    final headers = await _headers();
    final params = <String, String>{};
    if (after != null) params['after'] = after.toIso8601String();

    final uri = Uri.parse('$baseUrl/chat/$requestId/messages')
        .replace(queryParameters: params.isNotEmpty ? params : null);

    final response = await http.get(uri, headers: headers);
    if (response.statusCode != 200) {
      throw Exception('Failed to load messages: ${response.statusCode}');
    }

    final List<dynamic> data = jsonDecode(response.body) as List<dynamic>;
    return data
        .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ChatMessage> sendMessage({
    required String requestId,
    required String senderType,
    required String senderName,
    required String content,
  }) async {
    final headers = await _headers();
    final body = jsonEncode({
      'senderType': senderType,
      'senderName': senderName,
      'content': content,
    });

    final response = await http.post(
      Uri.parse('$baseUrl/chat/$requestId/messages'),
      headers: headers,
      body: body,
    );
    if (response.statusCode != 201) {
      throw Exception('Failed to send message: ${response.statusCode}');
    }
    return ChatMessage.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>);
  }
}
