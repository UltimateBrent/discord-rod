import { TextChannel } from 'discord.js';
import Alias from '../lib/alias';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Middleware from '../middleware/middleware';

/**
 * Run on every message, and applies an Alias if necesary.
 */
class AliasMiddleware extends Middleware {

	static priority = 1; // last before handlers

	static sayCommands = ['usealias', 'use', 'npc', 'say'];

	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// are we using a say command?
		if (AliasMiddleware.sayCommands.includes( req.command )) {
			// are we in a DM?
			if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');
			if (!req.parts.length) return await res.sendSimple('No alias provided.');

			const alias = Alias.FindAlias(req, req.parts[0]);
			if (!alias) return await res.sendSimple('No such alias exists: `' + req.parts[0] + '`');

			if (!alias.checkGrant(req)) return await res.sendSimple('You don\'t have permission to use that alias. Have an admin use `' + req.esc + 'grantalias` for you.');

			// we're good
			res.alias = alias;
			res.shouldSend = true;
			req.message.content = req.message.content.replace( req.esc + req.command + ' ' + req.parts[0], '').trim(); //req.parts.slice(1).join(' ');
			req.command = null;
			req.parseMessage();
			if (!req.command) res.content = req.message.content;
			AliasMiddleware.setTargetChannel(req, res);
			console.log('- going to handlers with:', req.command, res.alias);
			return;
		}

		// get current alias, if any
		const alias: Alias = req.user.getCurrentAlias( req );
		if (alias) {
			res.alias = alias;
			res.shouldSend = true;
			if (!req.command) res.content = req.message.content;

			AliasMiddleware.setTargetChannel(req, res);
		}
	}

	static setTargetChannel(req: RodRequest, res: RodResponse) {
		// if target channel, let's set it
		const target = req.server.channelAliasTargets[req.message.channel.id];
		if (target) {
			req.channel = req.message.guild.channels.resolve(target) as TextChannel;

			// paranoia
			if (!req.channel) req.channel = req.message.channel as TextChannel;
		}
	}

}

export default AliasMiddleware;