import 'package:dio/dio.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  final Dio dio;
  final SecureStorage secureStorage;
  final String baseUrl;

  ApiClient({
    required this.secureStorage,
    required this.baseUrl,
    Dio? dio,
  }) : dio = dio ?? Dio() {
    this.dio.options.baseUrl = baseUrl;
    this.dio.options.connectTimeout = const Duration(seconds: 10);
    this.dio.options.receiveTimeout = const Duration(seconds: 10);

    this.dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await secureStorage.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          // Dynamically resolve tenant id header
          options.headers['x-tenant-id'] = '11111111-1111-4111-8111-111111111111';
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            final refreshed = await _refreshToken();
            if (refreshed) {
              final options = error.requestOptions;
              final retryToken = await secureStorage.getAccessToken();
              options.headers['Authorization'] = 'Bearer $retryToken';

              // Retry the original request
              try {
                final response = await this.dio.fetch(options);
                return handler.resolve(response);
              } catch (e) {
                return handler.next(error);
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<bool> _refreshToken() async {
    final refreshToken = await secureStorage.getRefreshToken();
    if (refreshToken == null) return false;

    try {
      final refreshResponse = await Dio().post(
        '$baseUrl/v1/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (refreshResponse.statusCode == 200 || refreshResponse.statusCode == 201) {
        final data = refreshResponse.data as Map<String, dynamic>;
        final newAccess = data['accessToken'] as String;
        final newRefresh = data['refreshToken'] as String;

        await secureStorage.saveTokens(accessToken: newAccess, refreshToken: newRefresh);
        return true;
      }
    } catch (_) {
      await secureStorage.clearTokens();
    }
    return false;
  }
}
