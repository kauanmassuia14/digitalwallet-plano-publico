/// Domain model for a collection request between condominium and cooperative.
class CollectionRequest {
  final String id;
  final String tenantId;
  final String condominiumId;
  final String? cooperativeId;
  final String status; // PENDING | ASSIGNED | COMPLETED | CANCELLED
  final DateTime? scheduledFor;
  final DateTime? completedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final CollectionEntity? condominium;
  final CollectionEntity? cooperative;

  const CollectionRequest({
    required this.id,
    required this.tenantId,
    required this.condominiumId,
    this.cooperativeId,
    required this.status,
    this.scheduledFor,
    this.completedAt,
    required this.createdAt,
    required this.updatedAt,
    this.condominium,
    this.cooperative,
  });

  factory CollectionRequest.fromJson(Map<String, dynamic> json) {
    return CollectionRequest(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      condominiumId: json['condominiumId'] as String,
      cooperativeId: json['cooperativeId'] as String?,
      status: json['status'] as String,
      scheduledFor: json['scheduledFor'] != null
          ? DateTime.parse(json['scheduledFor'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      condominium: json['condominium'] != null
          ? CollectionEntity.fromJson(
              json['condominium'] as Map<String, dynamic>)
          : null,
      cooperative: json['cooperative'] != null
          ? CollectionEntity.fromJson(
              json['cooperative'] as Map<String, dynamic>)
          : null,
    );
  }

  String get statusLabel {
    switch (status) {
      case 'PENDING':
        return 'Aguardando Cooperativa';
      case 'ASSIGNED':
        return 'Cooperativa Confirmada';
      case 'COMPLETED':
        return 'Coleta Realizada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  }
}

class CollectionEntity {
  final String id;
  final String name;
  final String? address;

  const CollectionEntity({
    required this.id,
    required this.name,
    this.address,
  });

  factory CollectionEntity.fromJson(Map<String, dynamic> json) {
    return CollectionEntity(
      id: json['id'] as String,
      name: json['name'] as String,
      address: json['address'] as String?,
    );
  }
}

/// Domain model for a chat message within a collection request.
class ChatMessage {
  final String id;
  final String collectionRequestId;
  final String senderType; // CONDOMINIUM | COOPERATIVE | AI_AGENT
  final String senderName;
  final String content;
  final DateTime createdAt;

  const ChatMessage({
    required this.id,
    required this.collectionRequestId,
    required this.senderType,
    required this.senderName,
    required this.content,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      collectionRequestId: json['collectionRequestId'] as String,
      senderType: json['senderType'] as String,
      senderName: json['senderName'] as String,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
