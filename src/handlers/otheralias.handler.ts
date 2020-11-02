import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Alias from '../lib/alias';
import _ from 'lodash';
import User, {IUser} from '../models/user.model';


class MyAlias extends Handler {
	static setCommands = ['setaliasfor', 'setserveraliasfor'];
	static setChannelCommands = ['setchannelaliasfor'];
	static resetCommands = ['resetaliasfor'];

	static commands = _.union(
		MyAlias.setCommands,
		MyAlias.setChannelCommands,
		MyAlias.resetCommands
	);

	static async process(req: RodRequest, res: RodResponse): Promise<void> {
		const self = this;

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// which command type did we get?
		if (MyAlias.setCommands.includes(req.command)) return self.setFor(req, res);
		if (MyAlias.setChannelCommands.includes(req.command)) return self.setForChannelFor(req, res);
		if (MyAlias.resetCommands.includes(req.command)) return self.resetFor(req, res);
		
	}

	/**
	 * Sets the user's personal alias
	 * @param req
	 * @param res
	 */
	static async setFor(req: RodRequest, res: RodResponse): Promise<void> {

		// get the first mentioned user
		if (!req.message.mentions.users.size) return await res.sendSimple('You must @mention the user you want to set the alias for.', '`' + req.server.esc + req.command + ' id @name`');

		// it's not reasonable to assume they'd follow a parameter order for this one, so let's figure out which one is the alias id
		const aliasId = req.parts[0].slice(0, 1) == '<' ? req.parts[1] : req.parts[0];

		const du: Discord.User = req.message.mentions.users.first();
		const user: IUser = await User.GetFromID( du, req.channel.guild.id );

		let alias: Alias = null;
		if (req.parts[0] != 'off') {
			alias = Alias.FindAlias(req, req.parts[0]);
			if (!alias) return await res.sendSimple('No such alias exists: `' + req.parts[0] + '`');
			if (!alias.checkGrant(req)) return await res.sendSimple('You don\'t have permission to use that alias. Have an admin use `' + req.server.esc + 'grantalias` for you.');
		}

		await user.saveSetting( req, 'autoAlias', alias?.id);

		res.sendSimple('You set the server-level alias for <@' + user._id + '>  to `' + (alias?.id || 'off') + '`. If they posted in this channel, they would post as `' + (alias?.name || 'no alias') + '`.');
	}

	/**
	 * Sets the user's personal alias on this specific channel
	 * - `auto` means that rod will use their server setting, and `off` means they don't want an alias, no matter what.
	 * @param req
	 * @param res
	 */
	static async setForChannelFor( req: RodRequest, res: RodResponse): Promise<void> {
		
		let alias = null;
		if (req.parts[0] == 'none') req.parts[0] = 'off'; // confusing, so adding alias
		if (req.parts[0] != 'off' && req.parts[0] != 'auto') {
			alias = Alias.FindAlias(req, req.parts[0]);
			if (!alias) return await res.sendSimple('No such alias exists: `' + req.parts[0] + '`');
			if (!alias.checkGrant(req)) return await res.sendSimple('You don\'t have permission to use that alias. Have an admin use `' + req.server.esc + 'grantalias` for you.');
		}

		// put this alias into the current channel aliases
		const channelAliases = req.user.settings.channelAliases || {};
		channelAliases[ req.channel.id ] = alias?.id || (req.parts[0] == 'off' ? 'none' : null);

		req.user = await req.user.saveSetting( req, 'channelAliases', channelAliases );

		const current: Alias = req.user.getCurrentAlias(req);

		res.sendSimple('You set your alias for this channel to `' + (alias?.id || (req.parts[0] == 'off' ? 'off' : 'auto (use server setting)')) + '`. If you posted in this channel, you would post as `' + (current?.name || 'no alias') + '`.');
	}

	/**
	 * Resets the user's alias settings to off/auto everywhere
	 * @param req
	 * @param res
	 */
	static async resetFor( req: RodRequest, res: RodResponse): Promise<void> {
		
		req.user = await req.user.saveSetting( req, 'channelAliases', {} );
		req.user = await req.user.saveSetting( req, 'autoAlias', null );

		res.sendSimple('Your alias settings for this server have been reset.');
	}
}

export default MyAlias;
