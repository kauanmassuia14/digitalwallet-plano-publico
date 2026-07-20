import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../storage/secure_storage.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';

class AppRouter {
  final SecureStorage secureStorage;

  AppRouter({required this.secureStorage});

  late final GoRouter router = GoRouter(
    initialLocation: '/onboarding',
    redirect: (BuildContext context, GoRouterState state) async {
      final token = await secureStorage.getAccessToken();
      final isLoggingIn = state.matchedLocation == '/login';
      final isOnboarding = state.matchedLocation == '/onboarding';

      if (token == null) {
        if (!isLoggingIn && !isOnboarding) {
          return '/onboarding';
        }
      } else {
        if (isLoggingIn || isOnboarding) {
          return '/dashboard';
        }
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardScreen(),
      ),
    ],
  );
}
