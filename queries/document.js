import { updateSudo } from '@lblod/mu-auth-sudo';
import { sparqlEscapeString, sparqlEscapeUri , query } from 'mu';
import { MANDATEE_CHECK_GRAPH } from '../config';
import { parseSparqlResults } from './util';

async function renameFileFromDocument (doc, file, newFileName) {
  /*
   * Note that this query renames files in all graphs, while they only really need to be in one.
   * Renaming the files in all graphs however, keeps distributed data in sync. It also isn't a lost effort, since
   * renaming will have to be done anyway when someone with access to another graph requests a file-bundling-job.
   */
  const q = `
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>
  PREFIX prov: <http://www.w3.org/ns/prov#>

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
          { ${sparqlEscapeUri(doc)} a dossier:Stuk ;
              prov:value ${sparqlEscapeUri(file)} . }
          UNION
          { ${sparqlEscapeUri(doc)} a dossier:Stuk ;
              prov:value / ^prov:hadPrimarySource ${sparqlEscapeUri(file)} . }
          ${sparqlEscapeUri(file)} a nfo:FileDataObject ;
              nfo:fileName ?fileName .
          FILTER (?fileName != ${sparqlEscapeString(newFileName)})
      }
  }`;
  await updateSudo(q);
}


async function getMandateesForDocument (documentUri, isDecision) {
  if (!documentUri) {
    return [];
  }
  let queryString = `PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
PREFIX prov: <http://www.w3.org/ns/prov#>

SELECT DISTINCT ?mandatee WHERE {
   GRAPH ${sparqlEscapeUri(MANDATEE_CHECK_GRAPH)} {
    ?submissionActivity prov:generated ${sparqlEscapeUri(documentUri)} ;
                        ext:indieningVindtPlaatsTijdens ?subcase  .
    ?subcase ext:heeftBevoegde ?mandatee .
   }
}`
  if (isDecision) {
    queryString = `PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
PREFIX besluitvorming: <https://data.vlaanderen.be/ns/besluitvorming#>

SELECT DISTINCT ?mandatee WHERE {
   GRAPH ${sparqlEscapeUri(MANDATEE_CHECK_GRAPH)} {
     ${sparqlEscapeUri(documentUri)} besluitvorming:beschrijft ?decisionActivity .
     ?decisionActivity ext:beslissingVindtPlaatsTijdens ?subcase .
     ?subcase ext:heeftBevoegde ?mandatee .
   }
}`
  }

  const data = await query(queryString);
  return parseSparqlResults(data);
}

export {
  renameFileFromDocument,
  getMandateesForDocument
};
