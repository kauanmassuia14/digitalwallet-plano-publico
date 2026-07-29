import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/storage/secure_storage.dart';
import 'rewards_provider.dart';

class DashboardScreen extends StatefulWidget {
  final RewardsProvider provider;

  const DashboardScreen({super.key, required this.provider});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final TextEditingController _cashoutController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.provider.fetchDashboardData();
    });
  }

  @override
  void dispose() {
    _cashoutController.dispose();
    super.dispose();
  }

  void _showCashoutDialog(ThemeData theme) {
    _cashoutController.clear();
    showDialog<void>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Realizar Saque (Cashout)'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Digite o valor em Euros a ser retirado via Pix/SEPA sandbox.',
                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _cashoutController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Valor (€)',
                  hintText: '0.00',
                  border: OutlineInputBorder(),
                  prefixText: '€ ',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () async {
                final input = _cashoutController.text.trim();
                final val = double.tryParse(input);
                if (val == null || val <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Por favor, informe um valor válido.'),
                      backgroundColor: Colors.red,
                    ),
                  );
                  return;
                }

                final cents = (val * 100).round();
                Navigator.of(ctx).pop();

                final success = await widget.provider.processCashout(cents);
                if (mounted) {
                  if (success) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Saque processado com sucesso!'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(widget.provider.errorMessage ?? 'Falha ao processar saque.'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
              child: const Text('Confirmar'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.appTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              final secureStorage = SecureStorage();
              await secureStorage.clearTokens();
              if (mounted) {
                context.go('/onboarding');
              }
            },
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: widget.provider,
        builder: (context, _) {
          return RefreshIndicator(
            onRefresh: widget.provider.fetchDashboardData,
            child: widget.provider.isLoading && widget.provider.transactions.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (widget.provider.errorMessage != null)
                            Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(bottom: 16),
                              decoration: BoxDecoration(
                                color: Colors.red.shade50,
                                border: Border.all(color: Colors.red.shade200),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                widget.provider.errorMessage!,
                                style: TextStyle(color: Colors.red.shade900),
                              ),
                            ),
                          _buildBalanceCard(theme),
                          const SizedBox(height: 32),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.between,
                            children: [
                              Text(
                                'Histórico de Transações',
                                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              if (widget.provider.isLoading)
                                const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Expanded(
                            child: widget.provider.transactions.isEmpty
                                ? _buildEmptyState(theme, l10n)
                                : _buildTransactionsList(theme),
                          ),
                        ],
                      ),
                    ),
                  ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/scan'),
        icon: const Icon(Icons.qr_code_scanner),
        label: const Text('Escanear QR Code'),
      ),
    );
  }

  Widget _buildBalanceCard(ThemeData theme) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: theme.colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            Text(
              'Saldo Disponível',
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 8),
            Text(
              '€ ${widget.provider.balanceEur.toStringAsFixed(2)}',
              style: theme.textTheme.headlineLarge?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.hourglass_empty, size: 14, color: Colors.orange.shade700),
                const SizedBox(width: 4),
                Text(
                  'Pendente: € ${widget.provider.pendingBalanceEur.toStringAsFixed(2)}',
                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.orange.shade800),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                backgroundColor: theme.colorScheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              onPressed: widget.provider.balanceCents > 0 ? () => _showCashoutDialog(theme) : null,
              icon: const Icon(Icons.account_balance_wallet),
              label: const Text('Saque via Pix/SEPA'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionsList(ThemeData theme) {
    final dateFormat = DateFormat('dd/MM/yyyy HH:mm');

    return ListView.separated(
      itemCount: widget.provider.transactions.length,
      separatorBuilder: (context, index) => const Divider(),
      itemBuilder: (context, index) {
        final tx = widget.provider.transactions[index];
        final isEarn = tx.type.toUpperCase() == 'EARN';
        final amountEur = tx.amountCents / 100.0;

        return ListTile(
          leading: CircleAvatar(
            backgroundColor: isEarn ? Colors.green.shade50 : Colors.blue.shade50,
            child: Icon(
              isEarn ? Icons.add_circle : Icons.remove_circle,
              color: isEarn ? Colors.green.shade800 : Colors.blue.shade800,
            ),
          ),
          title: Text(
            isEarn ? 'Recompensa Recebida' : 'Retirada de Saldo (Saque)',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          subtitle: Text(dateFormat.format(tx.createdAt.toLocal())),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${isEarn ? "+" : "-"} € ${amountEur.toStringAsFixed(2)}',
                style: TextStyle(
                  color: isEarn ? Colors.green.shade800 : Colors.red.shade800,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                tx.status,
                style: TextStyle(
                  color: tx.status.toUpperCase() == 'SETTLED' ? Colors.grey : Colors.orange,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(ThemeData theme, AppLocalizations l10n) {
    return Center(
      child: Semantics(
        label: 'No transactions lists display indicator',
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.receipt_long, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              l10n.emptyStateNoTransactions,
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
