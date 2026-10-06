export const QUOTES = [
  {
    text: "Pendidikan adalah tuntutan di dalam hidup tumbuhnya anak-anak.",
    author: "Ki Hajar Dewantara",
  },
  {
    text: "Ing ngarsa sung tulada, ing madya mangun karsa, tut wuri handayani.",
    author: "Ki Hajar Dewantara",
  },
  {
    text: "The beautiful thing about learning is that nobody can take it away from you.",
    author: "B.B. King",
  },
  {
    text: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
  },
];

export function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
