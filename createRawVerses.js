const { Configuration, OpenAIApi } = require("openai");
const admin = require("firebase-admin");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Initialize Firestore and authentication credentials
/* const serviceAccount = require("./service-account-key.json"); */
const serviceAccount = require("./staging-service-account-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const embedBlob = async (blob) => {
  console.log(`Embedding ${blob}`);
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: blob,
  });
  const embeddings = response.data.data[0].embedding;
  return embeddings;
};

const addRawVerses = async () => {
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
        const blob = `${book.trim()} ${chapter.trim()}:${verse.trim()} ${verseText.trim()}`;

        // Check if the document exists
        // It doesn't have a predictable ID, so we have to query it
        const query = await rawVersesRef
          .where("book", "==", book)
          .where("chapter", "==", chapter)
          .where("verse", "==", verse)
          .get();

        if (query.empty) {
          console.log(`Adding ${book} ${chapter}:${verse}`);
          // If the document doesn't exist, create the embedding and add the document
          const vec = await embedBlob(blob);
          const data = {
            book,
            chapter,
            verse,
            text: verseText,
            bible: kjvDocId.trim(),
            blob,
            vec,
          };
          rawVersesRef.add(data);
        } else {
          console.log(
            `Document for ${book} ${chapter}:${verse} already exists, checking embeddings...`
          );
          // If the document already exists, check if it has a vec field that's an array with length 1536
          const doc = query.docs[0];
          const data = doc.data();
          if (data.vec && Array.isArray(data.vec) && data.vec.length === 1536) {
            console.log(
              `Document for ${book} ${chapter}:${verse} already has an embedding, skipping...`
            );
            // If it does, skip this verse
            continue;
          } else {
            console.log(
              `Document for ${book} ${chapter}:${verse} doesn't have an embedding, updating...`
            );
            // If it doesn't, create the embedding and update the document
            const vec = await embedBlob(blob);
            await doc.ref.update({ vec });
          }
        }
      }
    }
  }
};

addRawVerses();
