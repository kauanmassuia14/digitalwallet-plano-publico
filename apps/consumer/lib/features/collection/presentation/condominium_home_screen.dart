import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../collection/domain/collection_models.dart';
import '../../collection/data/collection_repository.dart';
import '../../../core/storage/secure_storage.dart';
import 'request_detail_screen.dart';
import 'new_request_screen.dart';

class CondominiumHomeScreen extends StatefulWidget {
  final SecureStorage secureStorage;
  const CondominiumHomeScreen({super.key, required this.secureStorage});

  @override
  State<CondominiumHomeScreen> createState() => _CondominiumHomeScreenState();
}

class _CondominiumHomeScreenState extends State<CondominiumHomeScreen> {
  late final CollectionRepository _repo;
  List<CollectionRequest> _requests = [];
  bool _loading = true;
  String? _error;
  String? _entityId;
  String? _entityName;

  @override
  void initState() {
    super.initState();
    _repo = CollectionRepository(secureStorage: widget.secureStorage);
    _load();
  }

  Future<void> _load() async {
    try {
      _entityId = await widget.secureStorage.getEntityId();
      _entityName = await widget.secureStorage.getEntityName();
      final requests = await _repo.listRequests(
        condominiumId: _entityId,
      );
      if (mounted) {
        setState(() {
          _requests = requests;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'PENDING':
        return Colors.orange;
      case 'ASSIGNED':
        return Colors.blue;
      case 'COMPLETED':
        return Colors.green;
      case 'CANCELLED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final active = _requests.where((r) => r.status != 'COMPLETED' && r.status != 'CANCELLED').toList();
    final history = _requests.where((r) => r.status == 'COMPLETED' || r.status == 'CANCELLED').toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0B0E14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF131822),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('🏢 Condomínio', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
            if (_entityName != null)
              Text(_entityName!, style: const TextStyle(fontSize: 12, color: Colors.white60)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white60),
            onPressed: () {
              setState(() => _loading = true);
              _load();
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => NewRequestScreen(
                secureStorage: widget.secureStorage,
                condominiumId: _entityId ?? '',
              ),
            ),
          );
          setState(() => _loading = true);
          _load();
        },
        backgroundColor: const Color(0xFF14B8A6),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Solicitar Coleta', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF14B8A6)))
          : _error != null
              ? _buildError()
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildSummaryCards(active, history),
                      const SizedBox(height: 24),
                      if (active.isNotEmpty) ...[
                        _buildSectionTitle('📋 Solicitações Ativas'),
                        const SizedBox(height: 12),
                        ...active.map((r) => _buildRequestCard(r, theme)),
                      ],
                      if (history.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        _buildSectionTitle('📜 Histórico'),
                        const SizedBox(height: 12),
                        ...history.map((r) => _buildRequestCard(r, theme)),
                      ],
                      if (_requests.isEmpty)
                        _buildEmptyState(),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSummaryCards(List<CollectionRequest> active, List<CollectionRequest> history) {
    final pending = _requests.where((r) => r.status == 'PENDING').length;
    final assigned = _requests.where((r) => r.status == 'ASSIGNED').length;
    final completed = history.where((r) => r.status == 'COMPLETED').length;

    return Row(
      children: [
        _statChip('⏳ Pendentes', pending, Colors.orange),
        const SizedBox(width: 8),
        _statChip('✅ Confirmadas', assigned, Colors.blue),
        const SizedBox(width: 8),
        _statChip('🎉 Realizadas', completed, Colors.green),
      ],
    );
  }

  Widget _statChip(String label, int count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Text('$count', style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold));
  }

  Widget _buildRequestCard(CollectionRequest r, ThemeData theme) {
    final color = _statusColor(r.status);
    final fmt = DateFormat('dd/MM HH:mm');
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => RequestDetailScreen(
            request: r,
            secureStorage: widget.secureStorage,
            myRole: 'CONDOMINIUM',
            myName: _entityName ?? 'Condomínio',
          ),
        ),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF131822),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(r.statusLabel, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
                Text(fmt.format(r.createdAt.toLocal()),
                    style: const TextStyle(color: Colors.white38, fontSize: 11)),
              ],
            ),
            const SizedBox(height: 12),
            if (r.cooperative != null)
              Row(
                children: [
                  const Icon(Icons.recycling, color: Color(0xFF14B8A6), size: 16),
                  const SizedBox(width: 6),
                  Text(r.cooperative!.name, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                ],
              ),
            if (r.scheduledFor != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.calendar_today, color: Colors.white38, size: 14),
                  const SizedBox(width: 6),
                  Text('Agendado: ${fmt.format(r.scheduledFor!.toLocal())}',
                      style: const TextStyle(color: Colors.white54, fontSize: 12)),
                ],
              ),
            ],
            if (r.status == 'ASSIGNED' || r.status == 'PENDING') ...[
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Icon(Icons.chat_bubble_outline, color: const Color(0xFF14B8A6), size: 14),
                  const SizedBox(width: 4),
                  Text('Ver chat', style: TextStyle(color: const Color(0xFF14B8A6), fontSize: 12)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          children: [
            const Icon(Icons.inbox_outlined, size: 64, color: Colors.white24),
            const SizedBox(height: 16),
            const Text('Nenhuma solicitação ainda', style: TextStyle(color: Colors.white54, fontSize: 16)),
            const SizedBox(height: 8),
            const Text('Toque no botão abaixo para solicitar sua primeira coleta.', style: TextStyle(color: Colors.white38, fontSize: 13), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
          const SizedBox(height: 16),
          Text(_error ?? 'Erro desconhecido', style: const TextStyle(color: Colors.white70), textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _load, child: const Text('Tentar novamente')),
        ],
      ),
    );
  }
}
