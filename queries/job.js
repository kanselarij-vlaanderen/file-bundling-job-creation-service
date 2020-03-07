import { query, update, uuid as generateUuid, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime } from 'mu';
import { updateSudo } from '@lblod/mu-auth-sudo';
import { RESOURCE_BASE, RDF_JOB_TYPE } from '../config';
import { createCollection } from '../lib/collection';
import { parseSparqlResults } from './util';

// const SCHEDULED = 'scheduled';
const RUNNING = 'http://vocab.deri.ie/cogs#Running';
const SUCCESS = 'http://vocab.deri.ie/cogs#Success';
const FAIL = 'http://vocab.deri.ie/cogs#Fail';

async function createJob () {
  const uuid = generateUuid();
  const job = {
    uri: RESOURCE_BASE + `/file-bundling-jobs/${uuid}`,
    id: uuid,
    status: RUNNING,
    created: new Date()
  };
  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX cogs: <http://vocab.deri.ie/cogs#>

  INSERT DATA {
      ${sparqlEscapeUri(job.uri)} a cogs:Job , ${sparqlEscapeUri(RDF_JOB_TYPE)} ;
          ext:status ${sparqlEscapeUri(job.status)} ;
          mu:uuid ${sparqlEscapeString(job.id)} ;
          dct:created ${sparqlEscapeDateTime(job.created)} .
  }`;
  await update(queryString); // NO SUDO
  return job;
}

async function insertAndattachCollectionToJob (job, collectionMembers) {
  const collection = await createCollection(collectionMembers.map(m => m.uri));
  const queryString = `
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

  INSERT {
      GRAPH ?g {
          ${sparqlEscapeUri(job.uri)} prov:used ${sparqlEscapeUri(collection.uri)} .
          ${sparqlEscapeUri(collection.uri)} a prov:Collection ;
                mu:uuid ${sparqlEscapeString(collection.id)} ;
                ext:sha256 ${sparqlEscapeString(collection.sha)} ;
                prov:hadMember ${collection.members.map(sparqlEscapeUri).join(',\n              ')} .
      }
  }
  WHERE {
      GRAPH ?g {
          ${sparqlEscapeUri(job.uri)} a ${sparqlEscapeUri(RDF_JOB_TYPE)} .
      }
  }`;
  await updateSudo(queryString);
  return job;
}

async function updateJobStatus (uri, status) {
  const time = new Date();
  let timePred;
  if (status === SUCCESS || status === FAIL) { // final statusses
    timePred = 'http://www.w3.org/ns/prov#endedAtTime';
  } else {
    timePred = 'http://www.w3.org/ns/prov#startedAtTime';
  }
  const escapedUri = sparqlEscapeUri(uri);
  let queryString = `
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
PREFIX cogs: <http://vocab.deri.ie/cogs#>

DELETE {
    GRAPH ?g {
      ${escapedUri} ext:status ?status .`;
  if (status) {
    queryString += `
      ${escapedUri} ${sparqlEscapeUri(timePred)} ?time .`;
  }
  queryString += `
    }
}`;
  if (status) {
    queryString += `
INSERT {
    GRAPH ?g {
        ${escapedUri} ext:status ${sparqlEscapeUri(status)} ;
            ${sparqlEscapeUri(timePred)} ${sparqlEscapeDateTime(time)} .
    }
}`;
  }
  queryString += `
WHERE {
    GRAPH ?g {
        ${escapedUri} a ${sparqlEscapeUri(RDF_JOB_TYPE)} .
        OPTIONAL { ${escapedUri} ext:status ?status }
        OPTIONAL { ${escapedUri} ${sparqlEscapeUri(timePred)} ?time }
    }
}`;
  await updateSudo(queryString);
}

async function findJobUsingCollection (collection) {
  const queryString = `
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX dct: <http://purl.org/dc/terms/>

  SELECT (?job AS ?uri) (?uuid as ?id) ?generated ?status ?created ?started ?ended WHERE {
      ${sparqlEscapeUri(collection)} a prov:Collection .
      ?job a ${sparqlEscapeUri(RDF_JOB_TYPE)} ;
          mu:uuid ?uuid ;
          prov:used ${sparqlEscapeUri(collection)} .
      OPTIONAL { ?job ext:status ?status }
      OPTIONAL { ?job prov:generated ?generated }
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

export {
  createJob,
  insertAndattachCollectionToJob,
  updateJobStatus,
  RUNNING, SUCCESS, FAIL,
  findJobUsingCollection
};
