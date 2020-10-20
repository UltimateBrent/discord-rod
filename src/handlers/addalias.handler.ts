import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Alias from '../lib/alias';
import _ from 'lodash';


class AddAlias extends Handler {
	static commands = ['addalias', 'addnpc', 'add'];

	/**
	 * Lists aliases that the user has access to
	 * @param req - the request
	 * @param res - the response
	 */
	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to add an alias.');

		if (!req.parts[0]) return await res.sendSimple('Your npc needs at least and id and a name.', '`/addalias id "My Name" http://images.com/myavatar.jpg`');

		const npc = {
			id: req.parts[0].toLowerCase(),
			name: req.parts[1],
			avatar: req.parts[2] || null,
			createdBy: req.message.author.id
		};

		// data checks
		if (!npc.id || !npc.name) return await res.sendSimple('Your npc needs at least and id and a name.', '`/addalias id "My Name" http://images.com/myavatar.jpg`');
		if (npc.id.length < 3 || npc.id.length > 32) return await res.sendSimple('Invalid Name', 'Your npc\'s id cannot be less than 3 characters or more than 32.');
		if (npc.name.length < 3 || npc.name.length > 32) return await res.sendSimple('Invalid Name', 'Your npc\'s name cannot be less than 3 characters or more than 32.');

		
	}
}

export default AddAlias;