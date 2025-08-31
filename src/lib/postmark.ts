import { ServerClient } from 'postmark';
import { ENV } from './env';

export const postmark = new ServerClient(ENV.POSTMARK_SERVER_TOKEN);
