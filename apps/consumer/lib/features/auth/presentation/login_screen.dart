import 'package:flutter/material.dart';
import '../../../core/storage/secure_storage.dart';

// Dev seed IDs (must match database seed)
const _kTenantId = '11111111-1111-4111-8111-111111111111';
const _kCondoUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const _kCoopUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const _kCondoEntityId = 'cd000001-0000-4000-8000-000000000001'; // Edifício Verde
const _kCoopEntityId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'; // CoopRecicla SP
const _kCondoEntityName = 'Edifício Verde';
const _kCoopEntityName = 'CoopRecicla SP';

class LoginScreen extends StatefulWidget {
  final String? role; // 'cooperative' | 'condominium'

  const LoginScreen({super.key, this.role});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  String get _roleLabel =>
      widget.role == 'cooperative' ? 'Cooperativa' : 'Condomínio';
  String get _roleIcon => widget.role == 'cooperative' ? '♻️' : '🏢';
  Color get _accentColor => widget.role == 'cooperative'
      ? const Color(0xFF14B8A6)
      : const Color(0xFF6366F1);
  String get _emailHint => widget.role == 'cooperative'
      ? 'operador@cooprecicla.org'
      : 'sindico@edificioverde.com';

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    await Future<void>.delayed(const Duration(milliseconds: 500));

    final email = _emailController.text.trim();
    final role = widget.role ?? 'condominium';

    // Dev: resolve IDs from email / role
    final String userId;
    final String entityId;
    final String entityName;

    if (role == 'cooperative') {
      userId = _kCoopUserId;
      entityId = _kCoopEntityId;
      entityName = _kCoopEntityName;
    } else {
      userId = _kCondoUserId;
      entityId = _kCondoEntityId;
      entityName = _kCondoEntityName;
    }

    final secureStorage = SecureStorage();
    await secureStorage.saveTokens(
      accessToken: userId,
      refreshToken: 'mock-refresh',
    );
    await secureStorage.saveTenantId(_kTenantId);
    await secureStorage.saveUserId(userId);
    await secureStorage.saveUserRole(role);
    await secureStorage.saveEntityId(entityId);
    await secureStorage.saveEntityName(entityName);

    if (mounted) {
      setState(() => _isLoading = false);
      if (role == 'cooperative') {
        Navigator.pushReplacementNamed(context, '/cooperative');
      } else {
        Navigator.pushReplacementNamed(context, '/condominium');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final routeRole = ModalRoute.of(context)?.settings.arguments as String?;
    final activeRole = routeRole ?? widget.role ?? 'condominium';
    final roleLabel = activeRole == 'cooperative' ? 'Cooperativa' : 'Condomínio';
    final roleIcon = activeRole == 'cooperative' ? '♻️' : '🏢';
    final accentColor = activeRole == 'cooperative'
        ? const Color(0xFF14B8A6)
        : const Color(0xFF6366F1);

    return Scaffold(
      backgroundColor: const Color(0xFF0B0E14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF131822),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Text(roleIcon, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
            Text(
              roleLabel,
              style: TextStyle(
                  color: accentColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 18),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),
                // Badge
                Center(
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: _accentColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: _accentColor.withOpacity(0.3)),
                    ),
                    child: Center(
                      child: Text(_roleIcon,
                          style: const TextStyle(fontSize: 40)),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Entrar como $_roleLabel',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Use as credenciais da sua conta',
                  style: TextStyle(color: Colors.white54, fontSize: 14),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                // Email field
                const Text('E-mail',
                    style: TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                        fontWeight: FontWeight.w500)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _emailController,
                  style: const TextStyle(color: Colors.white),
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    hintText: _emailHint,
                    hintStyle: const TextStyle(color: Colors.white38),
                    filled: true,
                    fillColor: const Color(0xFF131822),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Colors.white24),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Colors.white24),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: _accentColor),
                    ),
                  ),
                  validator: (val) {
                    if (val == null || val.isEmpty || !val.contains('@')) {
                      return 'Informe um e-mail válido';
                    }
                    return null;
                  },
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!,
                      style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                ],
                const Spacer(),
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _accentColor,
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          'Entrar como $_roleLabel',
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16),
                        ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Ambiente de desenvolvimento — autenticação real em W04',
                  style: TextStyle(color: Colors.white24, fontSize: 11),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
