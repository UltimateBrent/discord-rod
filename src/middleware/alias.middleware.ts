import { TextChannel } from 'discord.js';
import Alias from '../lib/alias';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Middleware from '../middleware/middleware';

/**
 * Run on every message, and applies an Alias if necesary.
 */
class AliasMiddleware extends Middleware {

	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// get current alias, if any
		const alias: Alias = req.user.getCurrentAlias( req );
		if (alias) {
			res.alias = alias;
			res.shouldSend = true;
			if (!req.command) res.content = req.message.content;

			// if target channel, let's set it
			const target = req.server.channelAliasTargets[ req.message.channel.id ];
			if (target) {
				req.channel = req.message.guild.channels.resolve( target ) as TextChannel;
				
				// paranoia
				if (!req.channel) req.channel = req.message.channel as TextChannel;
			}
		}
	}

}

export default AliasMiddleware;