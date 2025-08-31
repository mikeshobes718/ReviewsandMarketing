import { ServerClient } from 'postmark';
import { getEnv } from './env';

let _postmark: ServerClient | null = null;
export function getPostmarkClient(): ServerClient {
  if (_postmark) return _postmark;
  const { POSTMARK_SERVER_TOKEN } = getEnv();
  _postmark = new ServerClient(POSTMARK_SERVER_TOKEN);
  return _postmark;
}
