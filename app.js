import { app, errorHandler } from 'mu';

import {
  fetchFilesFromAgenda,
  fetchFilesFromAgendaByMandatees,
  fetchDecisionsByMandatees,
  fetchDecisionsFromAgenda,
  fetchAreDecisionsReleased,
  fetchFilesFromAgendaitem,
  fetchFilesFromCases,
  fetchFilesFromSubcases
} from './queries/agenda';
import { createJob, insertAndattachCollectionToJob, updateJobStatus, findJobUsingCollection } from './queries/job';
import { findCollectionByMembers } from './queries/collection';
import { fetchCurrentUser, filterByConfidentiality } from './queries/user';
import { overwriteFilenames } from './lib/overwrite-filename';
import { JSONAPI_JOB_TYPE, EXTENSION_PDF } from './config';

app.post('/agendas/:agenda_id/agendaitems/documents/files/archive', async (req, res, next) => {
  try {
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
    await createBundlingJobAndRespondWithPayload(files, res);
  } catch (err) {
    console.trace(err);
    const error = new Error(err.message || 'Something went wrong during the gathering of the documents.');
    error.status = 500;
    return next(error);
  }
});

app.post('/agendaitems/:agendaitem_id/documents/files/archive', async (req, res, next) => {
  try {
    const extensions = req.query.pdfOnly === 'true' ? [EXTENSION_PDF] : [] ;
    const currentUser = await fetchCurrentUser(req.headers['mu-session-id']);
    let files = await fetchFilesFromAgendaitem(req.params.agendaitem_id, currentUser, extensions);
    files = await filterByConfidentiality(files, currentUser);
    await createBundlingJobAndRespondWithPayload(files, res);
  } catch (err) {
    console.trace(err);
    const error = new Error(err.message || 'Something went wrong during the gathering of the documents.');
    error.status = 500;
    return next(error);
  }
});

app.post('/cases/:case_id/documents/files/archive', async (req, res, next) => {
  try {
    const extensions = req.query.pdfOnly === 'true' ? [EXTENSION_PDF] : [] ;
    const currentUser = await fetchCurrentUser(req.headers['mu-session-id']);
    let files = await fetchFilesFromCases(req.params.case_id, currentUser, extensions);
    files = await filterByConfidentiality(files, currentUser);
    await createBundlingJobAndRespondWithPayload(files, res);
  } catch (err) {
    console.trace(err);
    const error = new Error(err.message || 'Something went wrong during the gathering of the documents.');
    error.status = 500;
    return next(error);
  }
});

app.post('/subcases/:subcase_id/documents/files/archive', async (req, res, next) => {
  try {
    const extensions = req.query.pdfOnly === 'true' ? [EXTENSION_PDF] : [] ;
    const currentUser = await fetchCurrentUser(req.headers['mu-session-id']);
    let files = await fetchFilesFromSubcases(req.params.subcase_id, currentUser, extensions);
    files = await filterByConfidentiality(files, currentUser);
    await createBundlingJobAndRespondWithPayload(files, res);
  } catch (err) {
    console.trace(err);
    const error = new Error(err.message || 'Something went wrong during the gathering of the documents.');
    error.status = 500;
    return next(error);
  }
});

async function documentBundlingJob(job, files) {
  await overwriteFilenames(files);
  await insertAndattachCollectionToJob(job, files);
  await updateJobStatus(job.uri, null); // Unset "RUNNING" status, so the file-bundling-service can pick this up
}

async function createBundlingJobAndRespondWithPayload(files, res) {
  const collection = await findCollectionByMembers(files.map(f => `uri:${f.uri}|name:${f.name}`));
  let job;
  if (collection) {
    job = await findJobUsingCollection(collection.uri);
  }
  if (job) {
    res.status(200);
  } else if (files && files.length > 0) {
    job = await createJob();
    documentBundlingJob(job, files); // Fire but don't await
    res.status(201);
  } else {
    res.status(500);
    res.send('No zippable documents found');
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
}

app.use(errorHandler);
