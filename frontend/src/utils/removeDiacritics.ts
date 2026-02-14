/**
 * Removes Romanian diacritics from a string.
 * Maps: ă->a, â->a, î->i, ș->s, ț->t (and uppercase variants)
 */
const diacriticMap: Record<string, string> = {
  'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ț': 't',
  'Ă': 'A', 'Â': 'A', 'Î': 'I', 'Ș': 'S', 'Ț': 'T',
  // Also handle cedilla variants (ş, ţ) which some systems use
  'ş': 's', 'ţ': 't', 'Ş': 'S', 'Ţ': 'T',
};

const diacriticRegex = /[ăâîșțĂÂÎȘȚşţŞŢ]/g;

export function removeDiacritics(str: string): string {
  return str.replace(diacriticRegex, (char) => diacriticMap[char] || char);
}
