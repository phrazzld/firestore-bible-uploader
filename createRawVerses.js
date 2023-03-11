const admin = require("firebase-admin");
const fs = require("fs");

// Initialize Firestore and authentication credentials
/* const serviceAccount = require("./service-account-key.json"); */
const serviceAccount = require("./staging-service-account-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Read the contents of the text file
const text = fs.readFileSync("./kjv.txt", "utf-8");

// Split the text into an array of lines
const lines = text.split("\n");

// Define a regular expression to match book names
const bookRegex = /^BOOK:(.+)/;

// Define a regular expression to match chapter and verse numbers
const chapterVerseRegex = /^(\d+):(\d+)/;

// Define the identifier for the KJV Bible document
const kjvDocId = "kjv";

// Write the Bible to Firestore
// Create the rawVerses collection if it doesn't exist
const rawVersesRef = db.collection("rawVerses");

let book = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const bookMatch = line.match(bookRegex);
  if (bookMatch) {
    book = bookMatch[1].trim();
    // Set the book name
  } else {
    const chapterVerseMatch = line.match(chapterVerseRegex);
    if (chapterVerseMatch) {
      const chapter = chapterVerseMatch[1].trim();
      const verse = chapterVerseMatch[2].trim();
      const verseText = line
        .substring(chapterVerseMatch[0].length + 1)
        .trim();
      // Set the chapter, verse, and verse text
      const data = {
        book,
        chapter,
        verse,
        text: verseText,
        bible: kjvDocId.trim(),
        blob: `${book.trim()} ${chapter.trim()}:${verse.trim()} ${verseText.trim()}`
      };
      rawVersesRef.add(data);
    }
  }
}
