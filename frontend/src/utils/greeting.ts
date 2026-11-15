/** Salut dupa ora din zi: dimineata (5-11), ziua (11-18), seara (18-22), noapte. */
export const greeting = (date: Date = new Date()) => {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'Buna dimineata';
  if (h >= 11 && h < 18) return 'Buna ziua';
  if (h >= 18 && h < 22) return 'Buna seara';
  return 'Noapte buna';
};

/** "Buna seara, Flavius 👋" */
export const greetingFor = (fullName?: string | null) => {
  const first = (fullName || '').split(' ')[0]?.split('-')[0];
  return first ? `${greeting()}, ${first} 👋` : `${greeting()} 👋`;
};
