const admin = require("firebase-admin");
const fs = require("fs");

// Initialize Firestore and authentication credentials
const serviceAccount = require("./service-account-key.json");
/* const serviceAccount = require("./staging-service-account-key.json") */
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
// bibles collection contains books subcollection which contains chapters subcollection which contains verses field
// Read a line
// If it's a book, set the book name
// If it's a chapter and verse, set the chapter and verse and verse text
// If it's a blank line, set the chapter and verse to null
// Write the document to Firestore
// Repeat until all lines are read
let book = null;
let chapter = null;
let verse = null;
let verseText = null;

// Create the kjv document if it doesn't exist
db.collection("bibles").doc(kjvDocId.trim()).set(
  {
    name: "King James Version",
  },
  { merge: true }
);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const bookMatch = line.match(bookRegex);
  if (bookMatch) {
    book = bookMatch[1];
    // Create the book document if it doesn't exist
    db.collection("bibles")
      .doc(kjvDocId.trim())
      .collection("books")
      .doc(book.trim())
      .set(
        {
          name: book.trim(),
        },
        { merge: true }
      );
    chapter = null;
    verse = null;
    verseText = null;
  } else {
    const chapterVerseMatch = line.match(chapterVerseRegex);
    if (chapterVerseMatch) {
      chapter = chapterVerseMatch[1];
      verse = chapterVerseMatch[2];
      verseText = line.substring(chapterVerseMatch[0].length + 1);
    } else {
      chapter = null;
      verse = null;
      verseText = null;
    }
  }

  if (book && chapter && verse && verseText) {
    // Create the verse field if it doesn't exist
    db.collection("bibles")
      .doc(kjvDocId.trim())
      .collection("books")
      .doc(book.trim())
      .collection("chapters")
      .doc(chapter.trim())
      .set(
        {
          [verse]: verseText.trim(),
        },
        { merge: true }
      );
  }
}
