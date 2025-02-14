import crypto from 'crypto';
import { uuid as generateUuid } from 'mu';
import { RESOURCE_BASE } from '../config';

function createCollection (members) {
  const uuid = generateUuid();
  const uri = RESOURCE_BASE + `/collections/${uuid}`;
  const sortedMembers = members
    .map(f => `uri:${f.uri}|name:${f.name}`)
    .sort((a, b) => a.localeCompare(b));
  const hashFactory = crypto.createHash('sha256');
  const sha = hashFactory.update(sortedMembers.join('')).digest('hex');
  return {
    uri,
    id: uuid,
    sha,
    members
  };
}

export {
  createCollection
};
