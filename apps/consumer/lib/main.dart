import 'dart:async';
import 'package:flutter/material.dart';
import 'package:logger/logger.dart';
import 'app.dart';

final Logger logger = Logger(
  printer: SimplePrinter(colors: true),
);

void main() {
  // Capture all flutter frameworks errors and redirect to telemetries
  FlutterError.onError = (FlutterErrorDetails details) {
    logger.e('Uncaught Flutter Framework Error', error: details.exception, stackTrace: details.stack);
    // Secure reporting without passing sensitive fields (W08.7)
    _reportCrashToTelemetry(details.exceptionAsString(), details.stack);
  };

  // Run app inside a zoned guard to catch general asynchronous uncaught errors
  runZonedGuarded(() {
    WidgetsFlutterBinding.ensureInitialized();
    runApp(const ConsumerApp());
  }, (Object error, StackTrace stack) {
    logger.e('Uncaught Async Error', error: error, stackTrace: stack);
    _reportCrashToTelemetry(error.toString(), stack);
  });
}

void _reportCrashToTelemetry(String message, StackTrace? stack) {
  // Mock external reporting integration (e.g. Sentry/Firebase Crashlytics)
  // Ensure that no PII or secure tokens are included in the logged payloads
  logger.i('Crash reported to secure analytics dashboard. Details: $message');
}
