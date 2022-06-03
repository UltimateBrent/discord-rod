import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import Alias from '../lib/alias';
import _ from 'lodash';
import User, {IUser} from '../models/user.model';


class MyAlias extends MultiCommandHandler {

	static multiCommands = new Map([
		['setFor', ['setaliasfor', 'setserveraliasfor']],
		['setForChannelFor', ['setchannelaliasfor']],
		['resetFor', ['resetaliasfor']]
	]);

	/**
	 * Sets the user's personal alias
	 * @param req
	 * @param res
	 */
	static async setFor(req: RodRequest, res: RodResponse): Promise<void> {

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to set aliases for other people.');

		// get the first mentioned user
		if (!req.message.mentions.users.size) return await res.sendSimple('You must @mention the user you want to set the alias for.', '`' + req.esc + req.command + ' @name id`');

		// it's not reasonable to assume they'd follow a parameter order for this one, so let's figure out which one is the alias id
		const aliasId = req.parts[0].slice(0, 1) == '<' ? req.parts[1] : req.parts[0];

		const du: Discord.User = req.message.mentions.users.first();
		const user: IUser = await req.getUserFromID( du, req.channel.guild.id );

		let alias: Alias = null;
		if (aliasId != 'off') {
			alias = Alias.FindAlias(req, aliasId);
			if (!alias) return await res.sendSimple('No such alias exists: `' + aliasId + '`');
			if (!alias.checkGrant(req)) return await res.sendSimple('That user desn\'t have permission to use that alias. Please use `' + req.esc + 'grantalias` to grant it first.');
		}

		await req.saveUserSetting('autoAlias', alias?.id);

		res.sendSimple('You set the server-level alias for <@' + user._id + '>  to `' + (alias?.id || 'off') + '`. If they posted in this channel, they would post as `' + (alias?.name || 'no alias') + '`.');
	}

	/**
	 * Sets the user's personal alias on this specific channel
	 * - `auto` means that rod will use their server setting, and `off` means they don't want an alias, no matter what.
	 * @param req
	 * @param res
	 */
	static async setForChannelFor( req: RodRequest, res: RodResponse): Promise<void> {

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to set aliases for other people.');

		// get the first mentioned user
		if (!req.message.mentions.users.size) return await res.sendSimple('You must @mention the user you want to set the alias for.', '`' + req.esc + req.command + ' @name id`');

		// it's not reasonable to assume they'd follow a parameter order for this one, so let's figure out which one is the alias id
		let aliasId = req.parts[0].slice(0, 1) == '<' ? req.parts[1] : req.parts[0];

		const du: Discord.User = req.message.mentions.users.first();
		const user: IUser = await req.getUserFromID(du, req.channel.guild.id);
		
		let alias = null;
		if (aliasId == 'none') aliasId = 'off'; // confusing, so adding alias
		if (aliasId != 'off' && aliasId != 'auto') {
			alias = Alias.FindAlias(req, aliasId);
			if (!alias) return await res.sendSimple('No such alias exists: `' + aliasId + '`');
			if (!alias.checkGrant(req)) return await res.sendSimple('That user desn\'t have permission to use that alias. Please use `' + req.esc + 'grantalias` to grant it first.');
		}

		// put this alias into the current channel aliases
		const channelAliases = user.settings.channelAliases || {};
		channelAliases[req.channel.id] = alias?.id || (aliasId == 'off' ? 'none' : null);

		await req.saveUserSetting('channelAliases', channelAliases );

		const current: Alias = req.getCurrentAlias();

		res.sendSimple('You set the alias for this channel for <@' + user._id + '> to `' + (alias?.id || (aliasId == 'off' ? 'off' : 'auto (use server setting)')) + '`. If they posted in this channel, they would post as `' + (current?.name || 'no alias') + '`.');
	}

	/**
	 * Resets the user's alias settings to off/auto everywhere
	 * @param req
	 * @param res
	 */
	static async resetFor( req: RodRequest, res: RodResponse): Promise<void> {

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to set aliases for other people.');

		// get the first mentioned user
		if (!req.message.mentions.users.size) return await res.sendSimple('You must @mention the user you want to set the alias for.', '`' + req.esc + req.command + ' @name`');

		const du: Discord.User = req.message.mentions.users.first();
		const user: IUser = await req.getUserFromID(du, req.channel.guild.id);
		
		await req.saveUserSetting('channelAliases', {} );
		await req.saveUserSetting('autoAlias', null );

		res.sendSimple('<@' + user._id + '>\'s alias settings for this server have been reset.');
	}
}

export default MyAlias;
