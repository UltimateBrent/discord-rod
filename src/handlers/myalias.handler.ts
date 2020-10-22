import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Alias from '../lib/alias';
import _ from 'lodash';
import User from '../models/user.model';


class MyAlias extends Handler {
	static setCommands = ['setalias', 'setserveralias'];

	static commands = _.union(
		MyAlias.setCommands
	);

	static async process(req: RodRequest, res: RodResponse): Promise<void> {
		const self = this;

		// which command type did we get?
		if (MyAlias.setCommands.includes(req.command)) return self.set(req, res);
		
	}

	/**
	 * Sets the user's personal alias
	 * @param req
	 * @param res
	 */
	static async set(req: RodRequest, res: RodResponse): Promise<void> {

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		let alias = null;
		if (req.parts[0] != 'off') {
			alias = Alias.FindAlias(req, req.parts[0]);
			if (!alias) return await res.sendSimple('No such alias exists: `' + req.parts[0] + '`');
			if (!alias.checkGrant(req)) return await res.sendSimple('You don\'t have permission to use that alias. Have an admin use `' + req.server.esc + 'grantalias` for you.');
		}

		req.user = await req.user.saveSetting( req, 'autoAlias', alias?.name);

		const current: Alias = req.user.getCurrentAlias( req );

		res.sendSimple('You set your server-level alias to `' + (alias?.name || 'off') + '`. If you posted in this channel, you would post as `' + (current?.name || 'no alias') + '`.');
	}
}

export default MyAlias;
