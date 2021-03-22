import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Middleware from '../middleware/middleware';
import _ from 'lodash';
import User from '../models/user.model';

/**
 * Run commands as another user, to set saved rolls or aliases for others easily
 * @example `/su @user /saveroll sword d20`
 */
class SwitchUserMiddleware extends Middleware {

	static SuCommands = ['su', 'switchuser'];
	static priority = 100;

	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// are we using the su command?
		if (SwitchUserMiddleware.SuCommands.includes( req.command )) {

			// can we do this?
			const perm = req.getPermissions();
			if (perm != 'admin') return await res.sendSimple('You do not have permission run commands for others.');

			if (!req.message.mentions.users.size) return await res.sendSimple('You did not mention anyone to run this command as.', '`' + req.esc + 'su @name /command`');

			const du: Discord.User = req.message.mentions.users.first();
			const user = await User.GetFromID(du, req.channel.guild.id);

			req.user = user;

			// reset message info
			req.command = null;
			req.message.mentions.users.delete( du.id );
			req.message.content = req.parts.slice(1).join(' ');
			req.parseMessage();
		}
	}

}

export default SwitchUserMiddleware;