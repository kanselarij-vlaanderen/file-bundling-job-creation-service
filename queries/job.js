import { query, update, uuid as generateUuid, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime } from 'mu';
import { updateSudo } from '@lblod/mu-auth-sudo';
import { RESOURCE_BASE, JOB } from '../config';
import { createCollection } from '../lib/collection';
import { parseSparqlResults } from './util';

async function createJob () {
  const uuid = generateUuid();
  // this is a bit of a hack
  // we create a job with BUSY status and return the job id to frontend first
  // after that we create a collection and rename files if needed.
  // then we set the status to "SCHEDULED" so the file-bundling-service can start bundling the files
  // the status update on the job is received via deltas
  const job = {
    uri: RESOURCE_BASE + `/${JOB.JSONAPI_JOB_TYPE}/${uuid}`,
    id: uuid,
    status: JOB.STATUSES.BUSY,
    created: new Date()
  };
  const queryString = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX cogs: <http://vocab.deri.ie/cogs#>
  PREFIX adms: <http://www.w3.org/ns/adms#>

  INSERT DATA {
      ${sparqlEscapeUri(job.uri)} a cogs:Job , ${sparqlEscapeUri(JOB.RDF_TYPE)} ;
          adms:status ${sparqlEscapeUri(job.status)} ;
          mu:uuid ${sparqlEscapeString(job.id)} ;
          dct:created ${sparqlEscapeDateTime(job.created)} .
  }`;
  await update(queryString); // NO SUDO
  return job;
}

async function insertAndattachCollectionToJob (job, collectionMembers) {
  const collection = createCollection(collectionMembers);
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
                prov:hadMember ${collection.members.map(m => sparqlEscapeUri(m.uri)).join(',\n              ')} .
      }
  }
  WHERE {
      GRAPH ?g {
          ${sparqlEscapeUri(job.uri)} a ${sparqlEscapeUri(JOB.RDF_TYPE)} .
      }
  }`;
  await updateSudo(queryString);
  return job;
}

async function updateJobStatus (uri, status, errorMessage) {
  const time = new Date();
  let timePred;
  if (status === JOB.STATUSES.SUCCESS || status === JOB.STATUSES.FAILED) { // final statuses
    timePred = 'http://www.w3.org/ns/prov#endedAtTime';
  } else {
    timePred = 'http://www.w3.org/ns/prov#startedAtTime';
  }
  let queryString = `
PREFIX cogs: <http://vocab.deri.ie/cogs#>
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX schema: <http://schema.org/>

DELETE {
    GRAPH ?g {
        ${sparqlEscapeUri(uri)} adms:status ?status ;
            ${sparqlEscapeUri(timePred)} ?time ;
            schema:error ?message .
    }
}`;
// no prov:startedAtTime on setting scheduled status
    queryString += `
INSERT {
    GRAPH ?g {
        ${sparqlEscapeUri(uri)} adms:status ${sparqlEscapeUri(status)} .
        ${
          status !== JOB.STATUSES.SCHEDULED
            ? `${sparqlEscapeUri(uri)} ${sparqlEscapeUri(timePred)} ${sparqlEscapeDateTime(time)} .`
            : ""
        }
        ${
          errorMessage
            ? `${sparqlEscapeUri(uri)} schema:error ${sparqlEscapeString(errorMessage)} .`
            : ""
        }
    }
}
WHERE {
    GRAPH ?g {
        ${sparqlEscapeUri(uri)} a ${sparqlEscapeUri(JOB.RDF_TYPE)} .
        OPTIONAL { ${sparqlEscapeUri(uri)} adms:status ?status }
        OPTIONAL { ${sparqlEscapeUri(uri)} ${sparqlEscapeUri(timePred)} ?time }
        OPTIONAL { ${sparqlEscapeUri(uri)} schema:error ?message }
    }
}`;
  await updateSudo(queryString);
}

async function findJobUsingCollection (collection) {
  const queryString = `
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX adms: <http://www.w3.org/ns/adms#>
  PREFIX schema: <http://schema.org/>

  SELECT (?job AS ?uri) (?uuid as ?id) ?generated ?status ?created ?started ?ended ?message WHERE {
      ${sparqlEscapeUri(collection)} a prov:Collection .
      ?job a ${sparqlEscapeUri(JOB.RDF_TYPE)} ;
          mu:uuid ?uuid ;
          prov:used ${sparqlEscapeUri(collection)} .
      OPTIONAL { ?job adms:status ?status }
      OPTIONAL { ?job prov:generated ?generated }
      OPTIONAL { ?job dct:created ?created }
      OPTIONAL { ?job prov:startedAtTime ?started }
      OPTIONAL { ?job prov:endedAtTime ?ended }
      OPTIONAL { ?job schema:error ?message }
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
  findJobUsingCollection
};
