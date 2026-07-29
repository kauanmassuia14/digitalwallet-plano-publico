import 'dart:async';
import 'package:flutter/material.dart';
import 'app.dart';

void main() {
  runZonedGuarded(() {
    WidgetsFlutterBinding.ensureInitialized();
    runApp(const ConsumerApp());
  }, (Object error, StackTrace stack) {
    debugPrint('Uncaught error: $error');
  });
}


