enum Priority {
  battlefield(0),
  lane(1),
  node(2),
  unit(3),
  damage(4),
  controls(5),
  base(6);

  final int value;

  const Priority(this.value);
}
