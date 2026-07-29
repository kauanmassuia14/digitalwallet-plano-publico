import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../collection/domain/collection_models.dart';
import '../../collection/data/collection_repository.dart';
import '../../../core/storage/secure_storage.dart';

class RequestDetailScreen extends StatefulWidget {
  final CollectionRequest request;
  final SecureStorage secureStorage;
  final String myRole; // 'CONDOMINIUM' | 'COOPERATIVE'
  final String myName;

  const RequestDetailScreen({
    super.key,
    required this.request,
    required this.secureStorage,
    required this.myRole,
    required this.myName,
  });

  @override
  State<RequestDetailScreen> createState() => _RequestDetailScreenState();
}

class _RequestDetailScreenState extends State<RequestDetailScreen> {
  late final CollectionRepository _repo;
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<ChatMessage> _messages = [];
  bool _loadingMessages = true;
  bool _sending = false;
  Timer? _pollTimer;
  DateTime? _lastMessageTime;
  late CollectionRequest _request;

  @override
  void initState() {
    super.initState();
    _request = widget.request;
    _repo = CollectionRepository(secureStorage: widget.secureStorage);
    _loadMessages();
    // Poll every 5 seconds for new messages
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _pollMessages());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final msgs = await _repo.getMessages(_request.id);
      if (mounted) {
        setState(() {
          _messages = msgs;
          _lastMessageTime = msgs.isNotEmpty ? msgs.last.createdAt : null;
          _loadingMessages = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) setState(() => _loadingMessages = false);
    }
  }

  Future<void> _pollMessages() async {
    try {
      final newMsgs = await _repo.getMessages(
        _request.id,
        after: _lastMessageTime,
      );
      if (mounted && newMsgs.isNotEmpty) {
        setState(() {
          _messages.addAll(newMsgs);
          _lastMessageTime = _messages.last.createdAt;
        });
        _scrollToBottom();
      }
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _msgController.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() => _sending = true);
    _msgController.clear();

    try {
      final msg = await _repo.sendMessage(
        requestId: _request.id,
        senderType: widget.myRole,
        senderName: widget.myName,
        content: text,
      );
      if (mounted) {
        setState(() {
          _messages.add(msg);
          _lastMessageTime = msg.createdAt;
          _sending = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _sending = false);
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Erro ao enviar: $e')));
      }
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'PENDING': return Colors.orange;
      case 'ASSIGNED': return Colors.blue;
      case 'COMPLETED': return Colors.green;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(_request.status);

    return Scaffold(
      backgroundColor: const Color(0xFF0B0E14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF131822),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_request.condominium?.name ?? 'Solicitação',
                style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(_request.statusLabel,
                  style: TextStyle(
                      color: statusColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Details card
          _buildDetailsCard(statusColor),
          // Chat
          Expanded(
            child: _loadingMessages
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFF14B8A6)))
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) => _buildMessageBubble(_messages[i]),
                  ),
          ),
          // Input
          if (_request.status == 'ASSIGNED' || _request.status == 'PENDING')
            _buildMessageInput(),
        ],
      ),
    );
  }

  Widget _buildDetailsCard(Color statusColor) {
    final fmt = DateFormat('dd/MM/yyyy HH:mm');
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF131822),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusColor.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.apartment, color: Colors.white60, size: 16),
              const SizedBox(width: 8),
              Expanded(
                  child: Text(
                      _request.condominium?.address ?? _request.condominiumId,
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 13))),
            ],
          ),
          if (_request.cooperative != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.recycling,
                    color: Color(0xFF14B8A6), size: 16),
                const SizedBox(width: 8),
                Text(_request.cooperative!.name,
                    style: const TextStyle(
                        color: Color(0xFF14B8A6), fontSize: 13)),
              ],
            ),
          ],
          if (_request.scheduledFor != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.event, color: Colors.white38, size: 14),
                const SizedBox(width: 8),
                Text(fmt.format(_request.scheduledFor!.toLocal()),
                    style: const TextStyle(color: Colors.white54, fontSize: 12)),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage msg) {
    final isMe = msg.senderType == widget.myRole;
    final isAgent = msg.senderType == 'AI_AGENT';
    final fmt = DateFormat('HH:mm');

    if (isAgent) {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF1E1B33),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.purple.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            const Text('🤖', style: TextStyle(fontSize: 18)),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Agente DigitalWallet',
                      style: TextStyle(
                          color: Colors.purple,
                          fontSize: 11,
                          fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text(msg.content,
                      style: const TextStyle(color: Colors.white70, fontSize: 13)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            CircleAvatar(
              radius: 14,
              backgroundColor: Colors.blue.withOpacity(0.2),
              child: Text(msg.senderName[0],
                  style: const TextStyle(color: Colors.blue, fontSize: 11)),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMe)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4, left: 4),
                    child: Text(msg.senderName,
                        style: const TextStyle(
                            color: Colors.white54,
                            fontSize: 11,
                            fontWeight: FontWeight.w500)),
                  ),
                Container(
                  constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.72),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isMe
                        ? const Color(0xFF14B8A6)
                        : const Color(0xFF1E2433),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMe ? 16 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 16),
                    ),
                  ),
                  child: Text(msg.content,
                      style: TextStyle(
                          color: isMe ? Colors.white : Colors.white70,
                          fontSize: 14)),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 3, left: 4, right: 4),
                  child: Text(fmt.format(msg.createdAt.toLocal()),
                      style: const TextStyle(
                          color: Colors.white38, fontSize: 10)),
                ),
              ],
            ),
          ),
          if (isMe) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 14,
              backgroundColor: const Color(0xFF14B8A6).withOpacity(0.2),
              child: Text(widget.myName[0],
                  style: const TextStyle(
                      color: Color(0xFF14B8A6), fontSize: 11)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: EdgeInsets.only(
        left: 12,
        right: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        top: 12,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF131822),
        border: Border(top: BorderSide(color: Colors.white12)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _msgController,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              maxLines: null,
              decoration: InputDecoration(
                hintText: 'Mensagem...',
                hintStyle: const TextStyle(color: Colors.white38),
                filled: true,
                fillColor: const Color(0xFF0B0E14),
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _sendMessage,
            child: Container(
              width: 44,
              height: 44,
              decoration: const BoxDecoration(
                color: Color(0xFF14B8A6),
                shape: BoxShape.circle,
              ),
              child: _sending
                  ? const CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white)
                  : const Icon(Icons.send, color: Colors.white, size: 20),
            ),
          ),
        ],
      ),
    );
  }
}
