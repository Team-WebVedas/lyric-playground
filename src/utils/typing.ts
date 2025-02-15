
export const calculateWPM = (
  typedCharacters: number,
  timeElapsedInMinutes: number
) => {
  // Average word length is 5 characters
  const words = typedCharacters / 5;
  return Math.round(words / timeElapsedInMinutes);
};

export const calculateAccuracy = (
  correctCharacters: number,
  totalCharacters: number
) => {
  if (totalCharacters === 0) return 100;
  return Math.round((correctCharacters / totalCharacters) * 100);
};
