import 'package:flutter/material.dart';

class Label extends StatelessWidget {
  final String text;
  final Color color;
  final double size;
  final FontWeight weight;
  final TextDecoration decoration;
  final bool uppercase;
  final TextAlign? align;
  final TextOverflow? overflow;
  final int? maxLines;
  final double? height;

  const Label({
    required this.text,
    required this.color,
    this.size = 10,
    this.weight = FontWeight.normal,
    this.decoration = TextDecoration.none,
    this.uppercase = true,
    this.height = 1,
    this.align,
    this.overflow,
    this.maxLines,
  });

  @override
  Widget build(BuildContext context) {
    return Text(
      uppercase ? text.toUpperCase() : text,
      textAlign: align,
      maxLines: maxLines,
      style: TextStyle(
        color: color,
        fontSize: size,
        fontWeight: weight,
        decoration: decoration,
        letterSpacing: 1.1,
        height: height,
      ),
    );
  }
}