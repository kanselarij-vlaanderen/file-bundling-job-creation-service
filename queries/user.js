import { sparqlEscapeUri } from 'mu';
import { querySudo as query } from '@lblod/mu-auth-sudo';
import { parseSparqlResults } from './util';


async function fetchCurrentUser (sessionUri) {
  const accountQuery = `PREFIX session: <http://mu.semte.ch/vocabularies/session/>
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX org: <http://www.w3.org/ns/org#>

  SELECT ?user ?membership ?role WHERE {
    GRAPH <http://mu.semte.ch/graphs/sessions> {
      ${sparqlEscapeUri(sessionUri)} session:account ?account
    }
    GRAPH ?g {
       ?user foaf:account ?account .
       ?membership org:member ?user ;
                   org:role ?role .
    }
  }`;
  const currentAccount = await query(accountQuery);
  if (currentAccount) {
    let parsedResults = parseSparqlResults(currentAccount);
    let user = {
      memberships: []
    };
    // Parse the result array into something more useable. We'll get a full object with user, membership and role for each membership of the user (see ./util/parseSparqlResults)
    for (let result of parsedResults) {
      user.user = result.user; // this will always be the same
      user.memberships.push({
        membership: result.membership,
        role: result.role
      });
    }
    return user;
  }
  return;
}

async function fetchMandateesForUserOrganization (currentUser) {
  // this is where we'll query for the mandatees coupled to the currentUsers organization
  return [];
}
export {
  fetchCurrentUser,
  fetchMandateesForUserOrganization
}
