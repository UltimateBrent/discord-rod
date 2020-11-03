import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Alias from '../lib/alias';
import _ from 'lodash';
import User from '../models/user.model';


class CallHandler extends Handler {
	static callforCommands = ['call', 'callfor'];

	static commands = _.union(
		CallHandler.callforCommands
	);

	static async process(req: RodRequest, res: RodResponse): Promise<void> {
		const self = this;

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// which command type did we get?
		if (CallHandler.callforCommands.includes(req.command)) return self.callfor(req, res);
		
		
	}

	/**
	 * Grants access to an alias to set of users/roles
	 * @param req
	 * @param res
	 */
	static async callfor(req: RodRequest, res: RodResponse): Promise<void> {

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to start calls.');

		// check if there are any active calls
		// TODO check for active calls

		// parse
		const title = req.parts[0];
		const text = req.parts.slice(1).join(' ');

		// who was mentioned?
		let mentions = req.message.mentions.members.size ? _.map(req.message.mentions.members.array(), function (m) { return {id: m.id, name: m.displayName}; }) : [];

		// turn role members into members
		if (req.message.mentions.roles.size) {
			for (const role of req.message.mentions.roles.array()) {
				console.log('- checking role:', role.name);

				if (role.members.size) mentions = mentions.concat( _.map(role.members.array(), function (m) { return { id: m.id, name: m.displayName }; }) );
			}

			// might have double grabbed people from role
			mentions = _.uniq( mentions );
		}

		// any monster mentions? ex. `+Goblin`
		let monsters = [];
		for (let p of req.parts) {
			if (p.charAt(0) == '+') {
				p = p.slice(1);

				// remove quote if it's there
				if (p.charAt(0) == '"') p = p.slice(1);

				monsters.push( p );
			}
		}
		monsters = _.uniq( monsters );
		
		console.log('- found in call:', {mentions, monsters});

		// insert the call
		// TODO
		
	}

	
}

export default CallHandler;
