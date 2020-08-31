import { sparqlEscapeString, query } from 'mu';
import { parseSparqlResults } from './util';

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
          besluitvorming:geagendeerdStuk ?document .
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

export {
  fetchFilesFromAgenda
};
