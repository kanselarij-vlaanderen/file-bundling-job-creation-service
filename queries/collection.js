import crypto from 'crypto';
import { query, sparqlEscapeString } from 'mu';
import { parseSparqlResults } from './util';

async function findCollectionByMembers (members) {
  /*
   * Searches based on a hash of members instead of their literal triples,
   * as the latter causes computational heavy queries (inner joins) which the DB cannot handle
   */
  const sortedMembers = members.sort((a, b) => a.localeCompare(b));
  const hashFactory = crypto.createHash('sha256');
  const sha = hashFactory.update(sortedMembers.join('')).digest('hex');
  const q = `
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
SELECT DISTINCT (?collection as ?uri)
WHERE {
    ?collection a prov:Collection ;
        ext:sha256 ${sparqlEscapeString(sha)} .
}
  `;
  const results = await query(q); // NO SUDO!
  const parsedResults = parseSparqlResults(results);
  console.log('parsed results:', parsedResults);
  if (parsedResults.length > 0) {
    return parsedResults[0];
  } else {
    return null;
  }
}

export {
  findCollectionByMembers
};
