/**
 * Removes Romanian diacritics from a string.
 * Maps: a->a, a->a, i->i, s->s, t->t (and uppercase variants)
 */
const diacriticMap: Record<string, string> = {
  '\u0103': 'a', '\u00e2': 'a', '\u00ee': 'i', '\u0219': 's', '\u021b': 't',
  '\u0102': 'A', '\u00c2': 'A', '\u00ce': 'I', '\u0218': 'S', '\u021a': 'T',
  // Also handle cedilla variants
  '\u015f': 's', '\u0163': 't', '\u015e': 'S', '\u0162': 'T',
};

const diacriticRegex = /[\u0103\u00e2\u00ee\u0219\u021b\u0102\u00c2\u00ce\u0218\u021a\u015f\u0163\u015e\u0162]/g;

export function removeDiacritics(str: string): string {
  if (!str) return str;
  return str.replace(diacriticRegex, (char) => diacriticMap[char] || char);
}
