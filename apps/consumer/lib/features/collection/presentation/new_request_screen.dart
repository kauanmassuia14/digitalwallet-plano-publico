import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../collection/data/collection_repository.dart';
import '../../../core/storage/secure_storage.dart';

class NewRequestScreen extends StatefulWidget {
  final SecureStorage secureStorage;
  final String condominiumId;

  const NewRequestScreen({
    super.key,
    required this.secureStorage,
    required this.condominiumId,
  });

  @override
  State<NewRequestScreen> createState() => _NewRequestScreenState();
}

class _NewRequestScreenState extends State<NewRequestScreen> {
  late final CollectionRepository _repo;
  DateTime? _selectedDate;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _repo = CollectionRepository(secureStorage: widget.secureStorage);
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF14B8A6),
              surface: Color(0xFF131822),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final time = await showTimePicker(
        context: context,
        initialTime: const TimeOfDay(hour: 9, minute: 0),
        builder: (context, child) {
          return Theme(
            data: Theme.of(context).copyWith(
              colorScheme: const ColorScheme.dark(
                primary: Color(0xFF14B8A6),
                surface: Color(0xFF131822),
              ),
            ),
            child: child!,
          );
        },
      );
      if (time != null && mounted) {
        setState(() {
          _selectedDate = DateTime(
              picked.year, picked.month, picked.day, time.hour, time.minute);
        });
      }
    }
  }

  Future<void> _submit() async {
    if (widget.condominiumId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ID do condomínio não encontrado.')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await _repo.createRequest(
        condominiumId: widget.condominiumId,
        scheduledFor: _selectedDate,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Solicitação enviada com sucesso!'),
            backgroundColor: Color(0xFF14B8A6),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Erro: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('dd/MM/yyyy HH:mm');

    return Scaffold(
      backgroundColor: const Color(0xFF0B0E14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF131822),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Nova Solicitação de Coleta',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Info card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF131822),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF14B8A6).withOpacity(0.2)),
              ),
              child: const Column(
                children: [
                  Icon(Icons.recycling, color: Color(0xFF14B8A6), size: 48),
                  SizedBox(height: 12),
                  Text(
                    'Solicitar Coleta de Recicláveis',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Uma cooperativa disponível irá aceitar sua solicitação e agendar a coleta. Você será notificado quando isso acontecer.',
                    style: TextStyle(color: Colors.white54, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Date picker
            const Text(
              'Data e Hora Preferida (opcional)',
              style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF131822),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _selectedDate != null
                        ? const Color(0xFF14B8A6)
                        : Colors.white24,
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today,
                        color: Color(0xFF14B8A6), size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _selectedDate != null
                            ? fmt.format(_selectedDate!)
                            : 'Toque para escolher data e horário',
                        style: TextStyle(
                          color: _selectedDate != null
                              ? Colors.white
                              : Colors.white38,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    if (_selectedDate != null)
                      GestureDetector(
                        onTap: () => setState(() => _selectedDate = null),
                        child: const Icon(Icons.clear, color: Colors.white38, size: 18),
                      ),
                  ],
                ),
              ),
            ),

            const Spacer(),

            // Submit
            ElevatedButton(
              onPressed: _loading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF14B8A6),
                minimumSize: const Size(double.infinity, 52),
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.all(Radius.circular(14)),
                ),
              ),
              child: _loading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text(
                      'Enviar Solicitação',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16),
                    ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
