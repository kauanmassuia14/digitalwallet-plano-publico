import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/localization/app_localizations.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  bool _acceptedTerms = false;
  String _errorMessage = '';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Semantics(
          header: true,
          child: Text(l10n.appTitle),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Semantics(
                label: 'Onboarding header image description',
                image: true,
                child: const Icon(
                  Icons.eco,
                  size: 100,
                  color: Colors.green,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                l10n.onboardingTitle,
                style: theme.textTheme.headlineLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                l10n.onboardingSubtitle,
                style: theme.textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              CheckboxListTile(
                title: Text(
                  l10n.termsAndConditions,
                  style: theme.textTheme.bodyMedium,
                ),
                value: _acceptedTerms,
                onChanged: (val) {
                  setState(() {
                    _acceptedTerms = val ?? false;
                    _errorMessage = '';
                  });
                },
                controlAffinity: ListTileControlAffinity.leading,
              ),
              if (_errorMessage.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    _errorMessage,
                    style: TextStyle(color: theme.colorScheme.error, fontSize: 14),
                    textAlign: TextAlign.center,
                  ),
                ),
              const SizedBox(height: 24),
              Semantics(
                button: true,
                label: 'Continue to Login screen',
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: theme.colorScheme.primary,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () {
                    if (!_acceptedTerms) {
                      setState(() {
                        _errorMessage = l10n.termsError;
                      });
                    } else {
                      context.push('/login');
                    }
                  },
                  child: const Text('Continue'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
