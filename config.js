const RESOURCE_BASE = 'http://mu.semte.ch/services/file-bundling-service';
const RDF_JOB_TYPE = 'http://mu.semte.ch/vocabularies/ext/FileBundlingJob';
const JSONAPI_JOB_TYPE = 'file-bundling-jobs';
const LIMITED_ACCESS_ROLES = ['http://themis.vlaanderen.be/id/gebruikersrol/6bcebe59-0cb5-4c5e-ab40-ca98b65887a4'];
const ACCESS_LEVEL_CONFIDENTIAL = "http://themis.vlaanderen.be/id/concept/toegangsniveau/9692ba4f-f59b-422b-9402-fcbd30a46d17";

module.exports = {
  RESOURCE_BASE,
  RDF_JOB_TYPE,
  JSONAPI_JOB_TYPE,
  LIMITED_ACCESS_ROLES,
  ACCESS_LEVEL_CONFIDENTIAL,
};
