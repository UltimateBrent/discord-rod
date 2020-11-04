import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Middleware from '../middleware/middleware';
import _ from 'lodash';
import User from '../models/user.model';

/**
 * Run commands as another user, to set saved rolls or aliases for others easily
 */
class CallMiddleware extends Middleware {

	static priority = 100;

	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		
	}

}

export default CallMiddleware;