import sanitize from 'sanitize-filename';
import { renameFileFromDocument } from './queries/document';

async function overwriteFilenames (files) {
  /*
   * Currently, relations in our semantic model regarding documents look like this:
   * Document (dossier:Stuk) -> Logical file (nfo:FileDataObject) -> Physical file (nfo:FileDataObject)
   * Naming data is stored on the document as well as on the file, but *document* is master.
   * Services regarding files (file-bundling-service) however, only have knowledge of the *file* model (and its properties).
   * We here thus make sure that also the files carry the right name, as the file-bundling-service will use those.
   */
  for (const file of files) {
    const current = file.name;
    const fromDocName = `${file.documentName}.${file.extension}`;
    const expected = sanitize(fromDocName, { replacement: '_' });
    if (current !== expected) {
      await renameFileFromDocument(file.document, file.uri, expected);
    }
  }
}

export {
  overwriteFilenames
};
