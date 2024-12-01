import 'package:dafluta/dafluta.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/utils/navigation.dart';

class ConfirmationDialog extends StatelessWidget {
  final String message;
  final String buttonAccept;
  final String buttonCancel;
  final VoidCallback onAccept;
  final VoidCallback? onCancel;

  const ConfirmationDialog._(
    this.message,
    this.buttonAccept,
    this.buttonCancel,
    this.onAccept,
    this.onCancel,
  );

  static DialogController _show({
    required String message,
    required String buttonAccept,
    required String buttonCancel,
    required VoidCallback onAccept,
    VoidCallback? onCancel,
  }) {
    final BuildContext context = Navigation.context();

    showDialog(
      barrierDismissible: false,
      context: context,
      builder: (context) => ConfirmationDialog._(
        message,
        buttonAccept,
        buttonCancel,
        onAccept,
        onCancel,
      ),
    );

    return DialogController(context);
  }

  static DialogController won({
    required VoidCallback onAccept,
    required VoidCallback onCancel,
  }) =>
      _show(
        message: 'You won!',
        buttonAccept: 'Play again',
        buttonCancel: 'Quit',
        onAccept: onAccept,
        onCancel: onCancel,
      );

  static DialogController lost({
    required VoidCallback onAccept,
    required VoidCallback onCancel,
  }) =>
      _show(
        message: 'You lost!',
        buttonAccept: 'Play again',
        buttonCancel: 'Quit',
        onAccept: onAccept,
        onCancel: onCancel,
      );

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: AlertDialog(
        contentPadding: const EdgeInsets.all(25),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigation.pop();
              onCancel?.call();
            },
            child: Text(buttonCancel),
          ),
          TextButton(
            onPressed: () {
              Navigation.pop();
              onAccept.call();
            },
            child: Text(buttonAccept),
          ),
        ],
      ),
    );
  }
}
