import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'core/localization/app_localizations.dart';
import 'core/navigation/app_router.dart';
import 'core/storage/secure_storage.dart';
import 'core/theme/app_theme.dart';

class ConsumerApp extends StatefulWidget {
  const ConsumerApp({super.key});

  @override
  State<ConsumerApp> createState() => _ConsumerAppState();
}

class _ConsumerAppState extends State<ConsumerApp> {
  late final SecureStorage _secureStorage;
  late final AppRouter _appRouter;

  @override
  void initState() {
    super.initState();
    _secureStorage = SecureStorage();
    _appRouter = AppRouter(secureStorage: _secureStorage);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'DigitalWallet',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: _appRouter.router,
      localizationsDelegates: const [
        AppLocalizationsDelegate(),
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en'),
        Locale('es'),
        Locale('pt'),
      ],
    );
  }
}
