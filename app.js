import { app, errorHandler } from 'mu';

import { fetchFilesFromAgenda, fetchFilesFromAgendaByMandatees, fetchDecisionsByMandatees, fetchDecisionsFromAgenda, fetchAreDecisionsReleased} from './queries/agenda';
import { createJob, insertAndattachCollectionToJob, updateJobStatus, findJobUsingCollection } from './queries/job';
import { findCollectionByMembers } from './queries/collection';
import { fetchCurrentUser, filterByConfidentiality } from './queries/user';
import { overwriteFilenames } from './lib/overwrite-filename';
import { JSONAPI_JOB_TYPE } from './config';

const EXTENSION_PDF = "pdf";

app.post('/agendas/:agenda_id/agendaitems/documents/files/archive', async (req, res) => {
  const mandateeIdsString = req.query.mandateeIds;
  const extensions = req.query.pdfOnly === 'true' ? [EXTENSION_PDF] : [] ;
  let decisions = req.query.decisions === 'true';
  let files;
  const currentUser = await fetchCurrentUser(req.headers['mu-session-id']);
  const areDecisionsReleased = await fetchAreDecisionsReleased(req.params.agenda_id);
  if (mandateeIdsString) {
    const mandateeIds = mandateeIdsString.split(',');
    if (decisions){
      files = await fetchDecisionsByMandatees(req.params.agenda_id, mandateeIds, currentUser, extensions)
    } else {
      files = await fetchFilesFromAgendaByMandatees(req.params.agenda_id, mandateeIds, currentUser, extensions, areDecisionsReleased);
    }
  } else {
    if (decisions){
      files = await fetchDecisionsFromAgenda(req.params.agenda_id, currentUser, extensions);
    } else {
      files = await fetchFilesFromAgenda(req.params.agenda_id, currentUser, extensions, areDecisionsReleased);
    }
  }
  files = await filterByConfidentiality(files, currentUser, decisions);
  const collection = await findCollectionByMembers(files.map(f => `uri:${f.uri}|name:${f.name}`));
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
