import { app, errorHandler } from 'mu';

import { fetchFilesFromAgenda, fetchFilesFromAgendaByMandatees, fetchDecisionsByMandatees, fetchDecisionsFromAgenda} from './queries/agenda';
import { createJob, insertAndattachCollectionToJob, updateJobStatus, findJobUsingCollection } from './queries/job';
import { findCollectionByMembers } from './queries/collection';
import { fetchCurrentUser, fetchMandateesForUserOrganization } from './queries/user';
import { overwriteFilenames } from './lib/overwrite-filename';
import { JSONAPI_JOB_TYPE, LIMITED_ACCESS_ROLES } from './config';

app.post('/agendas/:agenda_id/agendaitems/documents/files/archive', async (req, res) => {
  const mandateeIdsString = req.query.mandateeIds;
  let decisions = req.query.decisions === 'true';
  let files;
  const currentUser = await fetchCurrentUser(req.headers['mu-session-id']);
  let hasLimitedRole = false;
  if (currentUser && currentUser.memberships) {
    for (let i = 0; i < currentUser.memberships.length; i++) {
      if (LIMITED_ACCESS_ROLES.indexOf(currentUser.memberships[i].role) > -1) {
        hasLimitedRole = true;
      }
    }
  }
  let linkedMandatees = [];
  if (hasLimitedRole) {
    // we can only include the confidential documents for the mandatees linked to the current user's organization
    linkedMandatees = await fetchMandateesForUserOrganization(currentUser);
  }
  if (mandateeIdsString) {
    const mandateeIds = mandateeIdsString.split(',');
    if (decisions){
      files = await fetchDecisionsByMandatees(req.params.agenda_id, mandateeIds, hasLimitedRole, linkedMandatees)
    } else {
      files = await fetchFilesFromAgendaByMandatees(req.params.agenda_id, mandateeIds, hasLimitedRole, linkedMandatees);
    }
  } else {
    if (decisions){
      files = await fetchDecisionsFromAgenda(req.params.agenda_id, hasLimitedRole, linkedMandatees);
    } else {
      files = await fetchFilesFromAgenda(req.params.agenda_id, hasLimitedRole, linkedMandatees);
    }
  }

  const collection = await findCollectionByMembers(files.map(m => m.uri));
  let job;
  if (collection) {
    job = await findJobUsingCollection(collection.uri);
  }
  if (job) {
    res.status(200);
  } else if (files && files.length > 0) {
    job = await createJob();
    documentBundlingJobForAgenda(req.params.agenda_id, job, files); // Fire but don't await
    res.status(201);
  } else {
    res.status(500);
    res.send('Agenda does not have zippable documents');
    return;
  }
  const payload = {};
  payload.data = {
    type: JSONAPI_JOB_TYPE,
    id: job.id,
    attributes: {
      uri: job.uri,
      status: job.status,
      created: job.created,
      started: job.started,
      ended: job.ended
    }
  };
  res.send(payload);
});

async function documentBundlingJobForAgenda (agendaId, job, files) {
  await overwriteFilenames(files);
  await insertAndattachCollectionToJob(job, files);
  await updateJobStatus(job.uri, null); // Unset "RUNNING" status, so the file-bundling-service can pick this up
}

app.use(errorHandler);
