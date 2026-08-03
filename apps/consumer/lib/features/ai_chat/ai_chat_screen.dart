import 'package:flutter/material.dart';

class AIChatMessage {
  final strId;
  final String text;
  final bool isUser;
  final DateTime timestamp;

  AIChatMessage({
    required this.strId,
    required this.text,
    required this.isUser,
    required this.timestamp,
  });
}

class AIChatScreen extends StatefulWidget {
  const AIChatScreen({super.key});

  @override
  State<AIChatScreen> createState() => _AIChatScreenState();
}

class _AIChatScreenState extends State<AIChatScreen> {
  final List<AIChatMessage> _messages = [
    AIChatMessage(
      strId: '1',
      text: 'Olá! Sou o assistente de IA da Cycle Track. Como posso ajudar com suas coletas hoje?',
      isUser: false,
      timestamp: DateTime.now(),
    ),
  ];
  final TextEditingController _controller = TextEditingController();
  bool _isLoading = false;

  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add(
        AIChatMessage(
          strId: DateTime.now().millisecondsSinceEpoch.toString(),
          text: text,
          isUser: true,
          timestamp: DateTime.now(),
        ),
      );
      _isLoading = true;
    });
    _controller.clear();

    // Simulação da resposta da IA conectada ao backend FastAPI
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _messages.add(
            AIChatMessage(
              strId: DateTime.now().millisecondsSinceEpoch.toString(),
              text: 'Cycle Track IA: Para solicitar coletas de materiais recicláveis, acesse o painel principal e clique em "Nova Coleta".',
              isUser: false,
              timestamp: DateTime.now(),
            ),
          );
          _isLoading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Assistente Cycle Track IA'),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                return Align(
                  alignment: msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4.0),
                    padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                    decoration: BoxDecoration(
                      color: msg.isUser ? Colors.teal.shade700 : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(16.0),
                    ),
                    child: Text(
                      msg.text,
                      style: TextStyle(
                        color: msg.isUser ? Colors.white : Colors.black87,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: CircularProgressIndicator(),
            ),
          Container(
            padding: const EdgeInsets.all(8.0),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(
                      hintText: 'Pergunte à IA...',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send, color: Colors.teal),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
