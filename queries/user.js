import { sparqlEscapeUri } from 'mu';
import { querySudo as query } from '@lblod/mu-auth-sudo';
import { parseSparqlResults } from './util';
import { getMandateesForDocument } from './document';
import { LIMITED_ACCESS_ROLES, ACCESS_LEVEL_CONFIDENTIAL } from '../config';


async function fetchCurrentUser (sessionUri) {
  // Note: mock accounts are in the http://mu.semte.ch/graphs/public graph, whereas regular accounts are in the http://mu.semte.ch/graphs/system/users graph.
  const accountQuery = `PREFIX session: <http://mu.semte.ch/vocabularies/session/>
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX org: <http://www.w3.org/ns/org#>
PREFIX sign: <http://mu.semte.ch/vocabularies/ext/handtekenen/>

  SELECT DISTINCT ?user ?membership ?role ?organization ?mandatee WHERE {
    GRAPH <http://mu.semte.ch/graphs/sessions> {
      ${sparqlEscapeUri(sessionUri)} session:account ?account
    }
    VALUES ?g { <http://mu.semte.ch/graphs/public> <http://mu.semte.ch/graphs/system/users> }
    GRAPH ?g {
      ?user foaf:account ?account .
      ?membership org:member ?user ;
                  org:role ?role ;
                  org:organization ?organization .
    }
    OPTIONAL {
      GRAPH <http://mu.semte.ch/graphs/system/users> {
        ?organization sign:isOrganisatieVoorMandataris ?mandatee .
      }
    }
  }`;
  const currentAccount = await query(accountQuery);
  if (currentAccount) {
    let parsedResults = parseSparqlResults(currentAccount);
    // Change the result array into something more useable. We'll get a full object with user, membership, role, organization, and mandatee for each membership & mandatee of the user (see ./util/parseSparqlResults)
    let user = {
      memberships: [],
      linkedMandatees: []
    };
    for (let result of parsedResults) {
      user.user = result.user; // this will always be the same
      if (!user.memberships.find(membership => membership.membership === result.membership)) {
        user.memberships.push({
          membership: result.membership,
          role: result.role,
          organization: result.organization
        });
      }
      if (result.mandatee && user.linkedMandatees.indexOf(result.mandatee) === -1) {
        user.linkedMandatees.push(result.mandatee);
      }
    }
    for (let i = 0; !user.hasLimitedRole && i < user.memberships.length; i++) {
      if (LIMITED_ACCESS_ROLES.indexOf(user.memberships[i].role) > -1) {
        user.hasLimitedRole = true;
      }
    }
    return user;
  }
  return;
}

async function filterByConfidentiality (files, currentUser, decisions) {
  if (currentUser.hasLimitedRole) {
    // We have to filter the confidential documents out asynchronously here. Incorporating the mandatees in the ./agenda.js queries could lead to multiple results per mandatee for 1 file in case of co-agenderingen
    // This will add a little time to the download job, but only for users with these limited access roles
    for (let i = 0; i < files.length; i++) {
      if (files[i].confidentialityLevel === ACCESS_LEVEL_CONFIDENTIAL) {
        let documentMandatees = await getMandateesForDocument(files[i].document, decisions)
        let isAllowed = false;
        for (const userMandatee of currentUser.linkedMandatees) {
          for (const documentMandatee of documentMandatees) {
            if (documentMandatee.mandatee === userMandatee) {
              isAllowed = true;
            }
          }
        }
        if (!isAllowed) {
          files.splice(i, 1);
          i--;
        }
      }
    }
  }
  return files;
}

export {
  fetchCurrentUser,
  filterByConfidentiality
}
