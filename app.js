import { app, errorHandler } from 'mu';

import { fetchFilesFromAgenda } from './queries/agenda';
import { createJob, insertAndattachCollectionToJob, updateJobStatus, findJobUsingCollection } from './queries/job';
import { findCollectionByMembers } from './queries/collection';
import { overwriteFilenames } from './lib/overwrite-filename';
import { JSONAPI_JOB_TYPE } from './config';

app.post('/agendas/:agenda_id/agendaitems/documents/files/archive', async (req, res) => {
  const files = await fetchFilesFromAgenda(req.params.agenda_id);
  const collection = await findCollectionByMembers(files.map(m => m.uri));
  let job;
  if (collection) {
    job = await findJobUsingCollection(collection.uri);
  }
  if (job) {
    res.status(200);
  } else {
    job = await createJob();
    documentBundlingJobForAgenda(req.params.agenda_id, job, files); // Fire but don't await
    res.status(201);
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
