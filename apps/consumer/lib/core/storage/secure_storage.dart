class SecureStorage {
  static final Map<String, String> _data = {};

  SecureStorage();

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userRoleKey = 'user_role';
  static const String _tenantIdKey = 'tenant_id';
  static const String _userIdKey = 'user_id';
  static const String _entityIdKey = 'entity_id';
  static const String _entityNameKey = 'entity_name';

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    _data[_accessTokenKey] = accessToken;
    _data[_refreshTokenKey] = refreshToken;
  }

  Future<String?> getAccessToken() async => _data[_accessTokenKey];
  Future<String?> getRefreshToken() async => _data[_refreshTokenKey];

  Future<void> saveUserRole(String role) async => _data[_userRoleKey] = role;
  Future<String?> getUserRole() async => _data[_userRoleKey];

  Future<void> saveTenantId(String tenantId) async => _data[_tenantIdKey] = tenantId;
  Future<String?> getTenantId() async => _data[_tenantIdKey];

  Future<void> saveUserId(String userId) async => _data[_userIdKey] = userId;
  Future<String?> getUserId() async => _data[_userIdKey];

  Future<void> saveEntityId(String entityId) async => _data[_entityIdKey] = entityId;
  Future<String?> getEntityId() async => _data[_entityIdKey];

  Future<void> saveEntityName(String name) async => _data[_entityNameKey] = name;
  Future<String?> getEntityName() async => _data[_entityNameKey];

  Future<void> clearTokens() async => _data.clear();
}
