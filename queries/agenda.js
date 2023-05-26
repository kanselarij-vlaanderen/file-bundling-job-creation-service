import { sparqlEscapeString, query } from 'mu';
import { parseSparqlResults } from './util';

const fetchFilesFromAgenda = async (agendaId, currentUser, extensions) => {
  let queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX besluitvorming: <https://data.vlaanderen.be/ns/besluitvorming#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX dbpedia: <http://dbpedia.org/ontology/>
  PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX prov: <http://www.w3.org/ns/prov#>

  SELECT DISTINCT (?file AS ?uri) ?name ?extension ?document ?documentName`
  if (currentUser.hasLimitedRole) {
    queryString += ' ?confidentialityLevel'
  }
  queryString += `
  WHERE {
      ?agenda a besluitvorming:Agenda ;
          mu:uuid ${sparqlEscapeString(agendaId)} ;
          dct:hasPart ?agendaitem .
      ?agendaitem a besluit:Agendapunt ;
          besluitvorming:geagendeerdStuk ?document .
      ?document a dossier:Stuk ;
          dct:title ?documentName .
      ?document prov:value / ^prov:hadPrimarySource? ?file . `
  if (currentUser.hasLimitedRole) {
    queryString += `
      ?document besluitvorming:vertrouwelijkheidsniveau ?confidentialityLevel .`
  }
  if (extensions.length) {
    queryString += `
    VALUES ?extension { ${extensions.map(extension => sparqlEscapeString(extension).toLowerCase()).join(" ")} }`
  }
  queryString += `
      ?file a nfo:FileDataObject ;
          nfo:fileName ?name ;
          dbpedia:fileExtension ?extension .
  }`;
  const data = await query(queryString);
  return parseSparqlResults(data);
};

const fetchFilesFromAgendaByMandatees = async (agendaId, mandateeIds, currentUser, extensions) => {
  let queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX besluitvorming: <https://data.vlaanderen.be/ns/besluitvorming#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX dbpedia: <http://dbpedia.org/ontology/>
  PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

  SELECT DISTINCT (?file AS ?uri) ?name ?extension ?document ?documentName`
  if (currentUser.hasLimitedRole) {
    queryString += ' ?confidentialityLevel'
  }
  queryString += `
  WHERE {
      ?agendaitem a besluit:Agendapunt ;
          besluitvorming:geagendeerdStuk ?document .
      {
        ?agenda a besluitvorming:Agenda ;
          mu:uuid ${sparqlEscapeString(agendaId)} ;
          dct:hasPart ?agendaitem .
        ?agendaitem ext:heeftBevoegdeVoorAgendapunt ?mandatee .
        ?mandatee mu:uuid ?mandateeId .
        FILTER (?mandateeId IN (${mandateeIds
          .map((id) => sparqlEscapeString(id))
          .join(", ")}))
      } UNION {
        ?agenda a besluitvorming:Agenda ;
          mu:uuid ${sparqlEscapeString(agendaId)} ;
          dct:hasPart ?agendaitem .
        FILTER NOT EXISTS { ?agendaitem ext:heeftBevoegdeVoorAgendapunt ?mandatee . }
      }
      ?document a dossier:Stuk ;
          dct:title ?documentName .
      ?document prov:value / ^prov:hadPrimarySource? ?file . `
  if (currentUser.hasLimitedRole) {
    queryString += `
      ?document besluitvorming:vertrouwelijkheidsniveau ?confidentialityLevel .`
  }
  if (extensions.length) {
    queryString += `
    VALUES ?extension { ${extensions.map(extension => sparqlEscapeString(extension).toLowerCase()).join(" ")} }`
  }
  queryString += `
      ?file a nfo:FileDataObject ;
          nfo:fileName ?name ;
          dbpedia:fileExtension ?extension .
  }`;
  const data = await query(queryString);
  return parseSparqlResults(data);
};

const fetchDecisionsByMandatees = async (agendaId, mandateeIds, currentUser, extensions) => {
  let queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX besluitvorming: <https://data.vlaanderen.be/ns/besluitvorming#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX dbpedia: <http://dbpedia.org/ontology/>
  PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

  SELECT DISTINCT (?file AS ?uri) ?name ?extension ?document ?documentName`
  if (currentUser.hasLimitedRole) {
    queryString += ' ?confidentialityLevel'
  }
  queryString += `
  WHERE {
      ?agendaitem a besluit:Agendapunt ;
          ^dct:subject/besluitvorming:heeftBeslissing/^besluitvorming:beschrijft ?document .
      {
        ?agenda a besluitvorming:Agenda ;
          mu:uuid ${sparqlEscapeString(agendaId)} ;
          dct:hasPart ?agendaitem .
        ?agendaitem ext:heeftBevoegdeVoorAgendapunt ?mandatee .
        ?mandatee mu:uuid ?mandateeId .
        FILTER (?mandateeId IN (${mandateeIds
          .map((id) => sparqlEscapeString(id))
          .join(", ")}))
      } UNION {
        ?agenda a besluitvorming:Agenda ;
          mu:uuid ${sparqlEscapeString(agendaId)} ;
          dct:hasPart ?agendaitem .
        FILTER NOT EXISTS { ?agendaitem ext:heeftBevoegdeVoorAgendapunt ?mandatee }
      }
      ?document a dossier:Stuk ;
          dct:title ?documentName .
      ?document prov:value / ^prov:hadPrimarySource? ?file . `
  if (currentUser.hasLimitedRole) {
    queryString += `
      ?document besluitvorming:vertrouwelijkheidsniveau ?confidentialityLevel .`
  }
  if (extensions.length) {
    queryString += `
    VALUES ?extension { ${extensions.map(extension => sparqlEscapeString(extension).toLowerCase()).join(" ")} }`
  }
  queryString += `
      ?file a nfo:FileDataObject ;
          nfo:fileName ?name ;
          dbpedia:fileExtension ?extension .
  }`;
  const data = await query(queryString);
  return parseSparqlResults(data);
};

const fetchDecisionsFromAgenda = async (agendaId, currentUser, extensions) => {
  let queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX besluitvorming: <https://data.vlaanderen.be/ns/besluitvorming#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX dbpedia: <http://dbpedia.org/ontology/>
  PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

  SELECT DISTINCT (?file AS ?uri) ?name ?extension ?document ?documentName`
  if (currentUser.hasLimitedRole) {
    queryString += ' ?confidentialityLevel'
  }
  queryString += `
  WHERE {
      ?agenda a besluitvorming:Agenda ;
          mu:uuid ${sparqlEscapeString(agendaId)} ;
          dct:hasPart ?agendaitem .
      ?agendaitem a besluit:Agendapunt ;
          ^dct:subject/besluitvorming:heeftBeslissing/^besluitvorming:beschrijft ?document .
      ?document a dossier:Stuk ;
          dct:title ?documentName .
      ?document prov:value / ^prov:hadPrimarySource? ?file . `
  if (currentUser.hasLimitedRole) {
    queryString += `
      ?document besluitvorming:vertrouwelijkheidsniveau ?confidentialityLevel .`
  }
  if (extensions.length) {
    queryString += `
    VALUES ?extension { ${extensions.map(extension => sparqlEscapeString(extension).toLowerCase()).join(" ")} }`
  }
  queryString += `
      ?file a nfo:FileDataObject ;
          nfo:fileName ?name ;
          dbpedia:fileExtension ?extension .
  }`;
  const data = await query(queryString);
  return parseSparqlResults(data);
}

export {
  fetchFilesFromAgenda,
  fetchFilesFromAgendaByMandatees,
  fetchDecisionsByMandatees,
  fetchDecisionsFromAgenda,
};
