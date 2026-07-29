import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../collection/domain/collection_models.dart';
import '../../collection/data/collection_repository.dart';
import '../../../core/storage/secure_storage.dart';
import 'request_detail_screen.dart';

class CooperativeHomeScreen extends StatefulWidget {
  final SecureStorage secureStorage;
  const CooperativeHomeScreen({super.key, required this.secureStorage});

  @override
  State<CooperativeHomeScreen> createState() => _CooperativeHomeScreenState();
}

class _CooperativeHomeScreenState extends State<CooperativeHomeScreen>
    with SingleTickerProviderStateMixin {
  late final CollectionRepository _repo;
  late final TabController _tabs;
  List<CollectionRequest> _pending = [];
  List<CollectionRequest> _assigned = [];
  List<CollectionRequest> _history = [];
  bool _loading = true;
  String? _error;
  String? _entityId;
  String? _entityName;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _repo = CollectionRepository(secureStorage: widget.secureStorage);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      _entityId = await widget.secureStorage.getEntityId();
      _entityName = await widget.secureStorage.getEntityName();
      final all = await _repo.listRequests();
      if (mounted) {
        setState(() {
          _pending = all.where((r) => r.status == 'PENDING').toList();
          _assigned = all
              .where((r) =>
                  r.status == 'ASSIGNED' &&
                  r.cooperativeId == _entityId)
              .toList();
          _history = all
              .where((r) =>
                  (r.status == 'COMPLETED' || r.status == 'CANCELLED') &&
                  r.cooperativeId == _entityId)
              .toList();
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

  Future<void> _acceptNext() async {
    if (_entityId == null) return;
    try {
      final accepted = await _repo.acceptRequest(_entityId!);
      if (accepted != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Coleta aceita com sucesso!'),
            backgroundColor: Color(0xFF14B8A6),
          ),
        );
        setState(() => _loading = true);
        _load();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Nenhuma coleta pendente disponível no momento.'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Erro: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0E14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF131822),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('♻️ Cooperativa',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white)),
            if (_entityName != null)
              Text(_entityName!,
                  style: const TextStyle(fontSize: 12, color: Colors.white60)),
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
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: const Color(0xFF14B8A6),
          labelColor: const Color(0xFF14B8A6),
          unselectedLabelColor: Colors.white38,
          tabs: [
            Tab(text: 'Fila (${_pending.length})'),
            Tab(text: 'Minhas (${_assigned.length})'),
            Tab(text: 'Histórico'),
          ],
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF14B8A6)))
          : _error != null
              ? _buildError()
              : TabBarView(
                  controller: _tabs,
                  children: [
                    _buildPendingTab(),
                    _buildAssignedTab(),
                    _buildHistoryTab(),
                  ],
                ),
    );
  }

  Widget _buildPendingTab() {
    if (_pending.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, size: 64, color: Colors.white24),
            SizedBox(height: 16),
            Text('Nenhuma coleta pendente',
                style: TextStyle(color: Colors.white54, fontSize: 16)),
            SizedBox(height: 8),
            Text('Todas as solicitações foram atendidas!',
                style: TextStyle(color: Colors.white38, fontSize: 13)),
          ],
        ),
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton.icon(
            onPressed: _acceptNext,
            icon: const Icon(Icons.handshake, color: Colors.white),
            label: const Text('Aceitar Próxima Coleta',
                style:
                    TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF14B8A6),
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _pending.length,
              itemBuilder: (_, i) => _buildPendingCard(_pending[i]),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPendingCard(CollectionRequest r) {
    final fmt = DateFormat('dd/MM HH:mm');
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF131822),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.apartment, color: Colors.orange, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(r.condominium?.name ?? r.condominiumId,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 15)),
              ),
            ],
          ),
          if (r.condominium?.address != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.location_on, color: Colors.white38, size: 14),
                const SizedBox(width: 4),
                Expanded(
                    child: Text(r.condominium!.address!,
                        style: const TextStyle(
                            color: Colors.white54, fontSize: 12))),
              ],
            ),
          ],
          if (r.scheduledFor != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.calendar_today, color: Colors.white38, size: 14),
                const SizedBox(width: 4),
                Text('Agendado: ${fmt.format(r.scheduledFor!.toLocal())}',
                    style:
                        const TextStyle(color: Colors.white54, fontSize: 12)),
              ],
            ),
          ],
          const SizedBox(height: 8),
          Text('Criado em ${fmt.format(r.createdAt.toLocal())}',
              style: const TextStyle(color: Colors.white38, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildAssignedTab() {
    if (_assigned.isEmpty) {
      return const Center(
        child: Text('Nenhuma coleta atribuída a você',
            style: TextStyle(color: Colors.white54)),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _assigned.length,
        itemBuilder: (_, i) => _buildAssignedCard(_assigned[i]),
      ),
    );
  }

  Widget _buildAssignedCard(CollectionRequest r) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => RequestDetailScreen(
            request: r,
            secureStorage: widget.secureStorage,
            myRole: 'COOPERATIVE',
            myName: _entityName ?? 'Cooperativa',
          ),
        ),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF131822),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.blue.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(r.condominium?.name ?? r.condominiumId,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 15)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text('Confirmada',
                      style: TextStyle(
                          color: Colors.blue,
                          fontSize: 11,
                          fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            if (r.condominium?.address != null) ...[
              const SizedBox(height: 6),
              Text(r.condominium!.address!,
                  style: const TextStyle(color: Colors.white54, fontSize: 12)),
            ],
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(children: [
                  Icon(Icons.chat_bubble_outline,
                      color: Color(0xFF14B8A6), size: 14),
                  SizedBox(width: 4),
                  Text('Chat ativo',
                      style:
                          TextStyle(color: Color(0xFF14B8A6), fontSize: 12)),
                ]),
                TextButton(
                  onPressed: () async {
                    await _repo.completeRequest(r.id);
                    setState(() => _loading = true);
                    _load();
                  },
                  child: const Text('✅ Marcar Concluída',
                      style: TextStyle(color: Colors.green, fontSize: 12)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (_history.isEmpty) {
      return const Center(
        child: Text('Nenhuma coleta no histórico',
            style: TextStyle(color: Colors.white54)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _history.length,
      itemBuilder: (_, i) {
        final r = _history[i];
        final fmt = DateFormat('dd/MM/yyyy');
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF131822),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white12),
          ),
          child: Row(
            children: [
              Icon(
                r.status == 'COMPLETED' ? Icons.check_circle : Icons.cancel,
                color: r.status == 'COMPLETED' ? Colors.green : Colors.red,
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(r.condominium?.name ?? r.condominiumId,
                        style: const TextStyle(
                            color: Colors.white70,
                            fontWeight: FontWeight.w600,
                            fontSize: 13)),
                    Text(
                        r.completedAt != null
                            ? fmt.format(r.completedAt!)
                            : fmt.format(r.createdAt),
                        style: const TextStyle(
                            color: Colors.white38, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
          const SizedBox(height: 16),
          Text(_error ?? 'Erro', style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 16),
          ElevatedButton(
              onPressed: _load, child: const Text('Tentar novamente')),
        ],
      ),
    );
  }
}
