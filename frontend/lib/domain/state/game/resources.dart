import 'package:overpowered/domain/types/resource_type.dart';

class Resources {
  final int amount;
  final ResourceType resourceType;

  const Resources({
    required this.amount,
    required this.resourceType,
  });
}
