import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import _ from 'lodash';

class PingHandler extends MultiCommandHandler {
	
	static multiCommands = new Map([
		['ping', ['ping']]
	]);

	/**
	 * Sets up a ping either directed at anyone or at a specific user/role
	 * @example `/ping @Brent I need you to send me your character sheet.`
	 * @param req
	 * @param res
	 */
	static async ping(req: RodRequest, res: RodResponse): Promise<void> {

		return await res.sendSimple('ponger');

		// who was mentioned?
		let mentions = req.message.mentions.members.size ? _.map(req.message.mentions.members.array(), function (m) { return { id: m.id, name: m.displayName }; }) : [];
	}
}

export default PingHandler;
