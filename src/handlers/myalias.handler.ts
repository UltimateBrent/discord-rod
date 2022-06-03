import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import Alias from '../lib/alias';
import _ from 'lodash';
import User from '../models/user.model';


class MyAlias extends MultiCommandHandler {
	
	static multiCommands = new Map([
		['set', ['setalias', 'setserveralias']],
		['setForChannel', ['setchannelalias']],
		['myAlias', ['myalias', 'alias']],
		['reset', ['resetalias']]
	]);

	/**
	 * Returns info about the user's current alias settings
	 * @param req
	 * @param res
	 */
	static async myAlias(req: RodRequest, res: RodResponse): Promise<void> {
		
		let user = req.user;

		if (req.message.mentions.users.size) {
			// they mentioned someone, let's see if they have permission to do this
			const perm = req.getPermissions();
			if (!perm) return await res.sendSimple('You do not have permission to check aliases.');

			const du: Discord.User = req.message.mentions.users.first();
			user = await req.getUserFromID(du, req.channel.guild.id);
		}

		const sKey = user.settings?.autoAlias || 'none';
		const caKey = user.settings?.channelAliases?.[ req.message.channel.id ] || 'auto';

		let text = '<@' + user._id + '>\'s server alias is set to: `' + sKey + '`\nTheir channel alias is set to: `' + caKey + '`\n\n';

		const current = user.getCurrentAlias( req );

		text += '<@' + user._id + '> would post here as: `' + (current?.name || 'no alias') + '`';

		res.embedContent = text;
	}

	/**
	 * Sets the user's personal alias
	 * @param req
	 * @param res
	 */
	static async set(req: RodRequest, res: RodResponse): Promise<void> {

		let alias: Alias = null;
		if (req.parts[0] != 'off') {
			alias = Alias.FindAlias(req, req.parts[0]);
			if (!alias) return await res.sendSimple('No such alias exists: `' + req.parts[0] + '`');
			if (!alias.checkGrant(req)) return await res.sendSimple('You don\'t have permission to use that alias. Have an admin use `' + req.esc + 'grantalias` for you.');
		}

		req.user = await req.user.saveSetting( req, 'autoAlias', alias?.id);

		const current: Alias = req.user.getCurrentAlias( req );

		res.sendSimple('You set your server-level alias to `' + (alias?.id || 'off') + '`. If you posted in this channel, you would post as `' + (current?.name || 'no alias') + '`.', null, { deleteCommand: true, deleteMessage: true });
	}

	/**
	 * Sets the user's personal alias on this specific channel
	 * - `auto` means that rod will use their server setting, and `off` means they don't want an alias, no matter what.
	 * @param req
	 * @param res
	 */
	static async setForChannel( req: RodRequest, res: RodResponse): Promise<void> {
		
		let alias = null;
		if (req.parts[0] == 'none') req.parts[0] = 'off'; // confusing, so adding alias
		if (req.parts[0] != 'off' && req.parts[0] != 'auto') {
			alias = Alias.FindAlias(req, req.parts[0]);
			if (!alias) return await res.sendSimple('No such alias exists: `' + req.parts[0] + '`');
			if (!alias.checkGrant(req)) return await res.sendSimple('You don\'t have permission to use that alias. Have an admin use `' + req.esc + 'grantalias` for you.');
		}

		// put this alias into the current channel aliases
		const channelAliases = req.user.settings.channelAliases || {};
		channelAliases[ req.channel.id ] = alias?.id || (req.parts[0] == 'off' ? 'none' : null);

		req.user = await req.user.saveSetting( req, 'channelAliases', channelAliases );

		const current: Alias = req.user.getCurrentAlias(req);

		res.sendSimple('You set your alias for this channel to `' + (alias?.id || (req.parts[0] == 'off' ? 'off' : 'auto (use server setting)')) + '`. If you posted in this channel, you would post as `' + (current?.name || 'no alias') + '`.', null, { deleteCommand: true, deleteMessage: true });
	}

	/**
	 * Resets the user's alias settings to off/auto everywhere
	 * @param req
	 * @param res
	 */
	static async reset( req: RodRequest, res: RodResponse): Promise<void> {
		
		req.user = await req.user.saveSetting( req, 'channelAliases', {} );
		req.user = await req.user.saveSetting( req, 'autoAlias', null );

		res.sendSimple('Your alias settings for this server have been reset.', null, { deleteCommand: true, deleteMessage: true });
	}
}

export default MyAlias;
