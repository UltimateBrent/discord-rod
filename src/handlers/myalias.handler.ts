import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Alias from '../lib/alias';
import _ from 'lodash';
import User from '../models/user.model';


class MyAlias extends Handler {
	static setCommands = ['setalias', 'setserveralias'];
	static setChannelCommands = ['setchannelalias'];
	static myAliasCommands = ['myalias', 'alias'];
	static resetCommands = ['resetalias'];

	static commands = _.union(
		MyAlias.setCommands,
		MyAlias.setChannelCommands,
		MyAlias.myAliasCommands,
		MyAlias.resetCommands
	);

	static async process(req: RodRequest, res: RodResponse): Promise<void> {
		const self = this;

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// which command type did we get?
		if (MyAlias.setCommands.includes(req.command)) return self.set(req, res);
		if (MyAlias.setChannelCommands.includes(req.command)) return self.setForChannel(req, res);
		if (MyAlias.myAliasCommands.includes(req.command)) return self.myAlias(req, res);
		if (MyAlias.resetCommands.includes(req.command)) return self.reset(req, res);
		
	}

	/**
	 * Returns info about the user's current alias settings
	 * @param req
	 * @param res
	 */
	static async myAlias(req: RodRequest, res: RodResponse): Promise<void> {
		
		const sKey = req.user.settings?.autoAlias || 'none';
		const caKey = req.user.settings?.channelAliases[ req.message.channel.id ] || 'auto';

		let text = 'Your server alias is set to: `' + sKey + '`\nYour channel alias is set to: `' + caKey + '`\n\n';

		const current = req.user.getCurrentAlias( req );

		text += 'You would post here as: `' + (current?.name || 'no alias') + '`';

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
			if (!alias.checkGrant(req)) return await res.sendSimple('You don\'t have permission to use that alias. Have an admin use `' + req.server.esc + 'grantalias` for you.');
		}

		req.user = await req.user.saveSetting( req, 'autoAlias', alias?.id);

		const current: Alias = req.user.getCurrentAlias( req );

		res.sendSimple('You set your server-level alias to `' + (alias?.id || 'off') + '`. If you posted in this channel, you would post as `' + (current?.name || 'no alias') + '`.');
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
	static async reset( req: RodRequest, res: RodResponse): Promise<void> {
		
		req.user = await req.user.saveSetting( req, 'channelAliases', {} );
		req.user = await req.user.saveSetting( req, 'autoAlias', null );

		res.sendSimple('Your alias settings for this server have been reset.');
	}
}

export default MyAlias;
