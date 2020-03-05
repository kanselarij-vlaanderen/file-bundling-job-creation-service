import { app, errorHandler } from 'mu';

import { fetchFileBundlingJobForAgenda, fetchFilesFromAgenda } from './queries/agenda';
import { createJob, insertAndattachCollectionToJob, updateJobStatus } from './queries/job';
import { overwriteFilenames } from './lib/overwrite-filenames';
import { JSONAPI_JOB_TYPE } from './config';

app.get('/agendas/:agenda_id/agendaitems/documents/files/archive', async (req, res) => {
  let job = await fetchFileBundlingJobForAgenda(req.params.agenda_id);
  if (job) {
    res.status(200);
  } else {
    job = await createJob();
    const filesPromise = fetchFilesFromAgenda(req.params.agenda_id); // Here, so we use the users access rights
    addAgendaCollectionToBundlingJob(job, filesPromise); // Fire but don't await
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

async function addAgendaCollectionToBundlingJob (job, filesPromise) {
  const files = await filesPromise;
  await overwriteFilenames(files);
  await insertAndattachCollectionToJob(job, files);
  await updateJobStatus(job.uri, null);
}

app.use(errorHandler);
