import 'package:flutter/material.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0E14),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              // Logo + tagline
              const Column(
                children: [
                  Icon(Icons.eco, size: 72, color: Color(0xFF14B8A6)),
                  SizedBox(height: 16),
                  Text(
                    'DigitalWallet',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Plataforma de Embalagens Circulares',
                    style: TextStyle(color: Colors.white54, fontSize: 15),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
              const Spacer(),
              // Portal selector
              const Text(
                'Selecione seu tipo de acesso',
                style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                    fontWeight: FontWeight.w500),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              _PortalCard(
                icon: '♻️',
                label: 'Cooperativa',
                description: 'Gerencie coletas, aceite solicitações e acompanhe seus ganhos.',
                accentColor: const Color(0xFF14B8A6),
                onTap: () => Navigator.pushNamed(context, '/login', arguments: 'cooperative'),
              ),
              const SizedBox(height: 12),
              _PortalCard(
                icon: '🏢',
                label: 'Condomínio',
                description: 'Solicite coletas, acompanhe o status e comunique-se com a cooperativa.',
                accentColor: const Color(0xFF6366F1),
                onTap: () => Navigator.pushNamed(context, '/login', arguments: 'condominium'),
              ),
              const SizedBox(height: 32),
              const Text(
                'Ao continuar, você concorda com os Termos de Uso e Política de Privacidade do DigitalWallet.',
                style: TextStyle(color: Colors.white24, fontSize: 11),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _PortalCard extends StatelessWidget {
  final String icon;
  final String label;
  final String description;
  final Color accentColor;
  final VoidCallback onTap;

  const _PortalCard({
    required this.icon,
    required this.label,
    required this.description,
    required this.accentColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF131822),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: accentColor.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: accentColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text(icon, style: const TextStyle(fontSize: 28)),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16)),
                  const SizedBox(height: 4),
                  Text(description,
                      style: const TextStyle(
                          color: Colors.white54, fontSize: 12),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(Icons.arrow_forward_ios, color: accentColor, size: 16),
          ],
        ),
      ),
    );
  }
}
