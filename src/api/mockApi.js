// src/api/mockApi.js
// Minimal placeholder so `import * as mockApi` works.
// Add any existing mock helpers here later if you want to centralize them.

export const version = 'mock-0';

// Example no-op mocks (optional, safe to remove)
export function ping() { return 'ok'; }

// ...keep your other imports/exports

// Minimal map so chapter cards render friendly names.
const CHAPTER_NAMES = {
  "8M-CH08": "Comparing Quantities",
  "9M-CH08": "Comparing Quantities",
  "9S-CH02": "Force and Laws of Motion",
};

export const api = {
  // ...keep whatever you already expose here
  cbse: {
    // your existing LO/exercise getters stay as-is

    /**
     * Build a stable PDF link for a chapter (used by chapterRef)
     * Uses env VITE_CBSE_PDF_BASE or /cbse-pdf by default.
     * Example final URL: /cbse-pdf/8M-CH08.pdf#page=111
     */
    linkToChapter(chapterId, page) {
      const base = import.meta.env.VITE_CBSE_PDF_BASE || "/cbse-pdf";
      const url = `${base}/${chapterId}.pdf${page ? `#page=${page}` : ""}`;
      return {
        url,
        chapterName: CHAPTER_NAMES[chapterId] || chapterId
      };
    },
  },
};

