import 'package:flutter/material.dart';
import '../storage/secure_storage.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/collection/presentation/condominium_home_screen.dart';
import '../../features/collection/presentation/cooperative_home_screen.dart';

class AppRouter {
  final SecureStorage secureStorage;

  AppRouter({required this.secureStorage});

  Map<String, WidgetBuilder> get routes => {
        '/': (context) => const OnboardingScreen(),
        '/onboarding': (context) => const OnboardingScreen(),
        '/login': (context) => const LoginScreen(),
        '/condominium': (context) =>
            CondominiumHomeScreen(secureStorage: secureStorage),
        '/cooperative': (context) =>
            CooperativeHomeScreen(secureStorage: secureStorage),
      };
}
