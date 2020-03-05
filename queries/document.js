import { updateSudo } from '@lblod/mu-auth-sudo';
import { sparqlEscapeString, sparqlEscapeUri } from 'mu';

async function renameFileFromDocument (doc, file, newFileName) {
  /*
   * Note that this query renames files in all graphs, while they only really need to be in one.
   * Renaming the files in all graphs however, keeps distributed data in sync. It also isn't a lost effort, since
   * renaming will have to be done anyway when someone with access to another graph requests a file-bundling-job.
   */
  const q = `
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>

  DELETE {
      GRAPH ?g {
          ${sparqlEscapeUri(file)} nfo:fileName ?fileName .
      }
  }
  INSERT {
      GRAPH ?g {
          ${sparqlEscapeUri(file)} nfo:fileName ${sparqlEscapeString(newFileName)} .
      }
  }
  WHERE {
      GRAPH ?g {
          ${sparqlEscapeUri(doc)} a dossier:Stuk ;
              ext:file ${sparqlEscapeUri(file)} .
          ${sparqlEscapeUri(file)} a nfo:FileDataObject ;
              nfo:fileName ?fileName .
          FILTER (?fileName != ${sparqlEscapeString(newFileName)})
      }
  }`;
  await updateSudo(q);
}

export {
  renameFileFromDocument
};
