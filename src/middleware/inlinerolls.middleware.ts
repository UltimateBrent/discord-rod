import { TextChannel } from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Middleware from '../middleware/middleware';
import _ from 'lodash';
import Roll from '../lib/roll';

/**
 * Run on every message and checks if any inline rolls (/roll d20) were used
 */
class InlineRollsMiddleware extends Middleware {

	static priority = 20;

	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// did `(/roll` or `(/r` appear in our message?
		if (req.message.content.includes('(' + req.server.esc + 'roll ') || req.message.content.includes('(' + req.server.esc + 'r ') ) {

			// lets get the rolls if we can
			let rolls = req.message.content.match(/[\(].r(?:oll)?(.*?)[\)]/g);
			if (rolls) {

				// remove the parens
				rolls = _.map( rolls, function(r) {
					return r.substr(1, r.length - 2);
				});

				// join into a multiroll
				const multi = rolls.join('; ');
				const roll = Roll.parseRoll( req, multi );

				if (roll.text) res.embedContent = roll.text;

				// remove these rolls from the original message and re-trigger the parse
				const reg = new RegExp(' ?[\\(]\\' + req.server.esc + '(.*?)[\\)]', 'g');
				req.message.content = req.message.content.replace(reg, '');
				req.parseMessage();

				// this might've already been replaced by an alias, so let's make sure the updated message is there
				// it'd be neat if I could set middleware priority or something, but this will have to do in the meantime
				if (!req.command && res.alias) res.content = req.message.content;
			}

		}
	}

}

export default InlineRollsMiddleware;