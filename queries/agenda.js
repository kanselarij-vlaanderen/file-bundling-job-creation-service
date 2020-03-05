import { updateSudo } from '@lblod/mu-auth-sudo';

import { sparqlEscapeString, sparqlEscapeUri, query } from 'mu';
import { RDF_JOB_TYPE } from '../config';
import { parseSparqlResults } from './util';
import { SUCCESS, RUNNING } from './job';

async function fetchFileBundlingJobForAgenda (agendaId) {
  const queryString = `
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX besluitvorming: <http://data.vlaanderen.be/ns/besluitvorming#>

  SELECT (?job AS ?uri) (?uuid as ?id) ?status ?created ?started ?ended WHERE {
      ?agenda a besluitvorming:Agenda ;
          mu:uuid ${sparqlEscapeString(agendaId)} ;
          ext:fileBundlingJob ?job .
      ?job a ${sparqlEscapeUri(RDF_JOB_TYPE)} ;
          mu:uuid ?uuid ;
          ext:status ?status .
      VALUES ?status {
          ${sparqlEscapeUri(SUCCESS)}
          ${sparqlEscapeUri(RUNNING)}
      }
      OPTIONAL { ?job dct:created ?created }
      OPTIONAL { ?job prov:startedAtTime ?started }
      OPTIONAL { ?job prov:endedAtTime ?ended }
  }`;
  const results = await query(queryString); // NO SUDO!
  const parsedResults = parseSparqlResults(results);
  if (parsedResults.length > 0) {
    return parsedResults[0];
  } else {
    return null;
  }
}

const fetchFilesFromAgenda = async (agendaId) => {
  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX besluitvorming: <http://data.vlaanderen.be/ns/besluitvorming#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX dbpedia: <http://dbpedia.org/ontology/>
  PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>

  SELECT DISTINCT (?file AS ?uri) ?name ?extension ?document ?documentName
  WHERE {
      ?agenda a besluitvorming:Agenda ;
          mu:uuid ${sparqlEscapeString(agendaId)} ;
          dct:hasPart ?agendaitem .
      ?agendaitem a besluit:Agendapunt ;
          ext:bevatAgendapuntDocumentversie ?document .
      ?document a dossier:Stuk ;
          dct:title ?documentName ;
          ext:file ?file .
      ?file a nfo:FileDataObject ;
          nfo:fileName ?name ;
          dbpedia:fileExtension ?extension .
  }`;
  const data = await query(queryString);
  return parseSparqlResults(data);
};

async function attachJobToAgenda (agendaId, job) {
  /*
   * Note that this query assumes the job to have been inserted in the same graph as
   * where the agenda resides. Ideally, the task of linking the job to the agenda would be
   * performed in the frontend, but that would require all kinds of users to be able to have :write-access
   * to Agenda's, which isn't the case, nor is easily achieveable in the mu-authorization config at the time of writing.
   * (https://github.com/kanselarij-vlaanderen/kaleidos-project/blob/eaacf6d30fc6b8e2c4a37f26dcb0e3dc1c03e48b/config/authorization/config.ex)
   */
  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX besluitvorming: <http://data.vlaanderen.be/ns/besluitvorming#>

  DELETE {
      GRAPH ?g {
          ?agenda ext:fileBundlingJob ?oldJob .
      }
  }
  INSERT {
      GRAPH ?g {
          ?agenda ext:fileBundlingJob ${sparqlEscapeUri(job)} .
      }
  }
  WHERE {
      GRAPH ?g {
          ?agenda a besluitvorming:Agenda ;
              mu:uuid ${sparqlEscapeString(agendaId)} .
          ${sparqlEscapeUri(job)} a ext:FileBundlingJob .
          OPTIONAL {
              ?agenda ext:fileBundlingJob ?oldJob .
          }
      }
  }`;
  await updateSudo(queryString);
}

export {
  fetchFileBundlingJobForAgenda,
  fetchFilesFromAgenda,
  attachJobToAgenda
};
