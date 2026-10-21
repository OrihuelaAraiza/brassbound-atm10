import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {crewApi} from '../../../../server/crew-api.mjs';
export const dynamic = 'force-dynamic';
async function handle(request: Request) { return crewApi(request,env.DB,await getChatGPTUser()); }
export {handle as GET,handle as POST,handle as PUT,handle as DELETE};
