import 'package:flutter/material.dart';

class AppLocalizations {
  final Locale locale;
  AppLocalizations(this.locale);

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const _localizedValues = {
    'en': {
      'appTitle': 'DigitalWallet',
      'onboardingTitle': 'Recycling Rewards Wallet',
      'onboardingSubtitle': 'Verify your circular packaging contributions and earn digital rewards easily.',
      'termsAndConditions': 'I agree to the Terms of Service and Privacy Policy.',
      'termsError': 'You must accept the terms to proceed.',
      'loginTitle': 'Welcome Back',
      'loginSubtitle': 'Login using your identity credentials.',
      'emailLabel': 'Email',
      'emailHint': 'Enter your email address',
      'loginButton': 'Log In',
      'loggingIn': 'Logging in...',
      'genericError': 'An error occurred. Please try again.',
      'emptyStateNoTransactions': 'No transactions found yet.',
      'offlineWarning': 'You are currently offline. Showing cached data.',
    },
    'es': {
      'appTitle': 'DigitalWallet',
      'onboardingTitle': 'Cartera de Recompensas de Reciclaje',
      'onboardingSubtitle': 'Verifique sus aportaciones de envases circulares y obtenga recompensas digitales fácilmente.',
      'termsAndConditions': 'Acepto los Términos de Servicio y la Política de Privacidad.',
      'termsError': 'Debe aceptar los términos para continuar.',
      'loginTitle': 'Bienvenido de nuevo',
      'loginSubtitle': 'Inicie sesión con sus credenciales de identidad.',
      'emailLabel': 'Correo electrónico',
      'emailHint': 'Ingrese su dirección de correo electrónico',
      'loginButton': 'Iniciar sesión',
      'loggingIn': 'Iniciando sesión...',
      'genericError': 'Ocurrió un error. Por favor intente de nuevo.',
      'emptyStateNoTransactions': 'No se encontraron transacciones todavía.',
      'offlineWarning': 'Actualmente no tiene conexión. Mostrando datos locales.',
    },
    'pt': {
      'appTitle': 'DigitalWallet',
      'onboardingTitle': 'Carteira de Recompensas de Reciclagem',
      'onboardingSubtitle': 'Comprove suas contribuições de circularidade de embalagens e resgate créditos digitais de forma simples.',
      'termsAndConditions': 'Eu aceito os Termos de Serviço e a Política de Privacidade.',
      'termsError': 'Você deve aceitar os termos para prosseguir.',
      'loginTitle': 'Bem-vindo de volta',
      'loginSubtitle': 'Faça login com suas credenciais de identidade.',
      'emailLabel': 'E-mail',
      'emailHint': 'Insira seu endereço de e-mail',
      'loginButton': 'Entrar',
      'loggingIn': 'Entrando...',
      'genericError': 'Ocorreu um erro. Por favor, tente novamente.',
      'emptyStateNoTransactions': 'Nenhuma transação encontrada.',
      'offlineWarning': 'Você está offline. Exibindo dados em cache.',
    }
  };

  String _get(String key) {
    return _localizedValues[locale.languageCode]?[key] ?? _localizedValues['en']?[key] ?? key;
  }

  String get appTitle => _get('appTitle');
  String get onboardingTitle => _get('onboardingTitle');
  String get onboardingSubtitle => _get('onboardingSubtitle');
  String get termsAndConditions => _get('termsAndConditions');
  String get termsError => _get('termsError');
  String get loginTitle => _get('loginTitle');
  String get loginSubtitle => _get('loginSubtitle');
  String get emailLabel => _get('emailLabel');
  String get emailHint => _get('emailHint');
  String get loginButton => _get('loginButton');
  String get loggingIn => _get('loggingIn');
  String get genericError => _get('genericError');
  String get emptyStateNoTransactions => _get('emptyStateNoTransactions');
  String get offlineWarning => _get('offlineWarning');
}

class AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['en', 'es', 'pt'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(AppLocalizationsDelegate old) => false;
}
