export const allAttributes = ["str", "dex", "int", "fai", "arc"] as const;

export type Attribute = typeof allAttributes[number];
export type Attributes = Record<Attribute, number>;

export const minimumAttributes: Attributes = {
  str: 8,
  dex: 10,
  int: 7,
  fai: 6,
  arc: 6,
};