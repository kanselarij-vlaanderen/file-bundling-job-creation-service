import { sparqlEscapeString, sparqlEscapeUri, query } from 'mu';
import { parseSparqlResults } from './util';
import { DECISION_RESULT_CODES_LIST } from '../config';

const fetchFilesFromAgenda = async (agendaId, currentUser, extensions, areDecisionsReleased) => {
  let queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX besluitvorming: <https://data.vlaanderen.be/ns/besluitvorming#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX dbpedia: <http://dbpedia.org/ontology/>
  PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX pav: <http://purl.org/pav/>

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
      OPTIONAL { ?nextDocument pav:previousVersion ?document . }
      FILTER NOT EXISTS { ?agendaitem besluitvorming:geagendeerdStuk ?nextDocument . }
      ?document prov:value / ^prov:hadPrimarySource? ?file . `
  if (areDecisionsReleased) {
    queryString += `
      OPTIONAL {
        ?agendaitem ^dct:subject/besluitvorming:heeftBeslissing/besluitvorming:resultaat ?decisionResultCode .
      }
      FILTER (?decisionResultCode NOT IN (${DECISION_RESULT_CODES_LIST
      .map((uri) => sparqlEscapeUri(uri))
      .join(", ")}))
    `
  }
  if (currentUser.hasLimitedRole) {
    queryString += `
      ?document besluitvorming:vertrouwelijkheidsniveau ?confidentialityLevel .`
  }
  if (extensions.length) {
    queryString += `
    VALUES ?extension { ${extensions.map(extension => sparqlEscapeString(extension).toLowerCase()).join(" ")} ${extensions.map(extension => sparqlEscapeString(extension).toUpperCase()).join(" ")} }`
  }
  queryString += `
      ?file a nfo:FileDataObject ;
          nfo:fileName ?name ;
          dbpedia:fileExtension ?extension .
  }`;
  const data = await query(queryString);
  return parseSparqlResults(data);
};

const fetchFilesFromAgendaByMandatees = async (agendaId, mandateeIds, currentUser, extensions, areDecisionsReleased) => {
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
  PREFIX pav: <http://purl.org/pav/>

  SELECT DISTINCT (?file AS ?uri) ?name ?extension ?document ?documentName`
  if (currentUser.hasLimitedRole) {
    queryString += ' ?confidentialityLevel'
  }
  queryString += `
  WHERE {
      ?agendaitem a besluit:Agendapunt ;
          besluitvorming:geagendeerdStuk ?document .
      OPTIONAL { ?nextDocument pav:previousVersion ?document . }
      FILTER NOT EXISTS { ?agendaitem besluitvorming:geagendeerdStuk ?nextDocument . }
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
  if (areDecisionsReleased) {
    queryString += `
      OPTIONAL {
        ?agendaitem ^dct:subject/besluitvorming:heeftBeslissing/besluitvorming:resultaat ?decisionResultCode .
      }
      FILTER (?decisionResultCode NOT IN (${DECISION_RESULT_CODES_LIST
      .map((uri) => sparqlEscapeUri(uri))
      .join(", ")}))
    `
  }
  if (currentUser.hasLimitedRole) {
    queryString += `
      ?document besluitvorming:vertrouwelijkheidsniveau ?confidentialityLevel .`
  }
  if (extensions.length) {
    queryString += `
    VALUES ?extension { ${extensions.map(extension => sparqlEscapeString(extension).toLowerCase()).join(" ")} ${extensions.map(extension => sparqlEscapeString(extension).toUpperCase()).join(" ")} }`
  }
  queryString += `
      ?file a nfo:FileDataObject ;
          nfo:fileName ?name ;
          dbpedia:fileExtension ?extension .
  }`;
  const data = await query(queryString);
  return parseSparqlResults(data);
};

const fetchDecisionsByMandatees = async (agendaId, mandateeIds, currentUser) => {
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
  PREFIX sign: <http://mu.semte.ch/vocabularies/ext/handtekenen/>

  SELECT DISTINCT (?file AS ?uri) ?name ?extension ?document ?documentName`
  if (currentUser.hasLimitedRole) {
    queryString += ' ?confidentialityLevel'
  }
  queryString += `
  WHERE {
      ?agendaitem a besluit:Agendapunt ;
          ^dct:subject/besluitvorming:heeftBeslissing/^besluitvorming:beschrijft ?originalDocument .
          ?originalDocument prov:value / ^prov:hadPrimarySource? ?originalFile .
      {
        select ?agendaitem WHERE {
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
        }
      }

      OPTIONAL {
          ?originalDocument sign:getekendStukKopie ?flattenedDocument .
          ?flattenedDocument prov:value ?flattenedFile .
      }
      BIND(IF(BOUND(?flattenedDocument), ?flattenedDocument, ?originalDocument) AS ?document)
      BIND(IF(BOUND(?flattenedFile), ?flattenedFile , ?originalFile) AS ?file)

      ?document a dossier:Stuk ;
          dct:title ?documentName .`
  if (currentUser.hasLimitedRole) {
    queryString += `
      ?document besluitvorming:vertrouwelijkheidsniveau ?confidentialityLevel .`
  }
  queryString += `
      ?file a nfo:FileDataObject ;
          nfo:fileName ?name ;
          dbpedia:fileExtension ?extension .
  }`;
  const data = await query(queryString);
  return parseSparqlResults(data);
};

const fetchDecisionsFromAgenda = async (agendaId, currentUser) => {
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
  PREFIX sign: <http://mu.semte.ch/vocabularies/ext/handtekenen/>

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
          ^dct:subject/besluitvorming:heeftBeslissing/^besluitvorming:beschrijft ?originalDocument .
      ?originalDocument prov:value / ^prov:hadPrimarySource? ?originalFile .

      OPTIONAL {
          ?originalDocument sign:getekendStukKopie ?flattenedDocument .
          ?flattenedDocument prov:value ?flattenedFile .
      }

      BIND(COALESCE(?flattenedDocument , ?originalDocument) AS ?document)
      BIND(COALESCE(?flattenedFile , ?originalFile) AS ?file)

      ?document a dossier:Stuk ;
          dct:title ?documentName . `
  if (currentUser.hasLimitedRole) {
    queryString += `
      ?document besluitvorming:vertrouwelijkheidsniveau ?confidentialityLevel .`
  }
  queryString += `
      ?file a nfo:FileDataObject ;
          nfo:fileName ?name ;
          dbpedia:fileExtension ?extension .
  }`;
  const data = await query(queryString);
  return parseSparqlResults(data);
}
const fetchAreDecisionsReleased = async (agendaId) => {
  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX besluitvorming: <https://data.vlaanderen.be/ns/besluitvorming#>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

  ASK WHERE {
    ?agenda a besluitvorming:Agenda ;
            mu:uuid ${sparqlEscapeString(agendaId)} .
    ?meeting a besluit:Vergaderactiviteit .
    ?agenda besluitvorming:isAgendaVoor ?meeting .
    ?decisionPublicationActivity
      ext:internalDecisionPublicationActivityUsed ?meeting ;
      prov:startedAtTime ?decisionPublicationActivityStartDate .
  }
  `
  const response = await query(queryString);
  return response.boolean;
}

const fetchFilesFromAgendaitem = async(agendaitemId, currentUser, extensions) => {
  let queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX besluitvorming: <https://data.vlaanderen.be/ns/besluitvorming#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX dbpedia: <http://dbpedia.org/ontology/>
  PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX pav: <http://purl.org/pav/>

  SELECT DISTINCT (?file AS ?uri) ?name ?extension ?document ?documentName`
  if (currentUser.hasLimitedRole) {
    queryString += ' ?confidentialityLevel'
  }
  queryString += `
  WHERE {
      ?agendaitem a besluit:Agendapunt ;
          mu:uuid ${sparqlEscapeString(agendaitemId)} ;
          besluitvorming:geagendeerdStuk ?document .
      ?document a dossier:Stuk ;
          dct:title ?documentName .
      OPTIONAL { ?nextDocument pav:previousVersion ?document . }
      FILTER NOT EXISTS { ?agendaitem besluitvorming:geagendeerdStuk ?nextDocument . }
      ?document prov:value / ^prov:hadPrimarySource? ?file . `

  if (currentUser.hasLimitedRole) {
    queryString += `
      ?document besluitvorming:vertrouwelijkheidsniveau ?confidentialityLevel .`
  }
  if (extensions.length) {
    queryString += `
    VALUES ?extension { ${extensions.map(extension => sparqlEscapeString(extension).toLowerCase()).join(" ")} ${extensions.map(extension => sparqlEscapeString(extension).toUpperCase()).join(" ")} }`
  }
  queryString += `
      ?file a nfo:FileDataObject ;
          nfo:fileName ?name ;
          dbpedia:fileExtension ?extension .
  }`;
  const data = await query(queryString);
  return parseSparqlResults(data);
}

const fetchFilesFromCases = async(caseId, currentUser, extensions) => {
  // We wanted to use the relation of case.pieces, but move subcase does not trigger a sync of those documents
  // ?case dossier:Dossier.bestaatUit ?document .
  let queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX besluitvorming: <https://data.vlaanderen.be/ns/besluitvorming#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX dbpedia: <http://dbpedia.org/ontology/>
  PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX pav: <http://purl.org/pav/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

  SELECT DISTINCT (?file AS ?uri) ?name ?extension ?document ?documentName`
  if (currentUser.hasLimitedRole) {
    queryString += ' ?confidentialityLevel'
  }
  queryString += `
  WHERE {
      ?case a dossier:Dossier ;
          mu:uuid ${sparqlEscapeString(caseId)} .
      ?case dossier:Dossier.isNeerslagVan ?decisionmakingFlow .
      ?decisionmakingFlow dossier:doorloopt ?subcase .
      ?subcase a dossier:Procedurestap .
      ?submissionActivity a ext:Indieningsactiviteit ;
          ext:indieningVindtPlaatsTijdens ?subcase ;
          prov:generated ?document .
      ?document a dossier:Stuk ;
          dct:title ?documentName .
      FILTER NOT EXISTS { [] pav:previousVersion ?document }
      ?document prov:value / ^prov:hadPrimarySource? ?file . `

  if (currentUser.hasLimitedRole) {
    queryString += `
      ?document besluitvorming:vertrouwelijkheidsniveau ?confidentialityLevel .`
  }
  if (extensions.length) {
    queryString += `
    VALUES ?extension { ${extensions.map(extension => sparqlEscapeString(extension).toLowerCase()).join(" ")} ${extensions.map(extension => sparqlEscapeString(extension).toUpperCase()).join(" ")} }`
  }
  queryString += `
      ?file a nfo:FileDataObject ;
          nfo:fileName ?name ;
          dbpedia:fileExtension ?extension .
  }`;
  const data = await query(queryString);
  return parseSparqlResults(data);
}

const fetchFilesFromSubcases = async(subcaseId, currentUser, extensions) => {
  let queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX besluitvorming: <https://data.vlaanderen.be/ns/besluitvorming#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX dbpedia: <http://dbpedia.org/ontology/>
  PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX pav: <http://purl.org/pav/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

  SELECT DISTINCT (?file AS ?uri) ?name ?extension ?document ?documentName`
  if (currentUser.hasLimitedRole) {
    queryString += ' ?confidentialityLevel'
  }
  queryString += `
  WHERE {
      ?subcase a dossier:Procedurestap ;
          mu:uuid ${sparqlEscapeString(subcaseId)} .
      ?submissionActivity a ext:Indieningsactiviteit ;
          ext:indieningVindtPlaatsTijdens ?subcase ;
          prov:generated ?document .
      ?document a dossier:Stuk ;
          dct:title ?documentName .
      FILTER NOT EXISTS { [] pav:previousVersion ?document }
      ?document prov:value / ^prov:hadPrimarySource? ?file . `

  if (currentUser.hasLimitedRole) {
    queryString += `
      ?document besluitvorming:vertrouwelijkheidsniveau ?confidentialityLevel .`
  }
  if (extensions.length) {
    queryString += `
    VALUES ?extension { ${extensions.map(extension => sparqlEscapeString(extension).toLowerCase()).join(" ")} ${extensions.map(extension => sparqlEscapeString(extension).toUpperCase()).join(" ")} }`
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
  fetchAreDecisionsReleased,
  fetchFilesFromAgendaitem,
  fetchFilesFromCases,
  fetchFilesFromSubcases
};
