/* eslint-disable no-cond-assign */
import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Middleware from '../middleware/middleware';
import _ from 'lodash';
import Call from '../lib/call';
import Roll from '../lib/roll';

/**
 * Checks any roll run on this request against active Calls
 */
class CallMiddleware extends Middleware {

	static priority = -10; // after command processing

	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// is there an active call for this channel?
		const call = Call.GetActiveCall( req );
		const roll = res.roll;

		// do we have things to check?
		if (!call || !roll) return;

		// was this specifically bypassed?
		if (roll.raw.includes( 'nocall' )) return;

		// let's see if this roll is relevant to the call
		let m = null;
		let key = null;
		if (m = _.find(call.npcs.concat(_.map(call.mentions, 'name')), function (n) { return req.rollFor ? req.rollFor.toLowerCase() == n.toLowerCase() : false; })) {
			key = 'n' + m;
		} else
		if (m = _.find(call.mentions, function (m) { return m.id == req.message.author.id || m.name.toLowerCase() == req.message.member.displayName.toLowerCase(); })) { // check mentions/roles
			key = 'm' + m.id;
		} else
		if (res.postAs && _.find(call.npcs, function (n) { return res.postAs.name.toLowerCase() == n.toLowerCase(); })) {
			m = _.find(call.npcs.concat(_.map(call.mentions, 'name')), function (n) { return res.postAs.name.toLowerCase() == n.toLowerCase(); });
			key = 'n' + m;
		}

		if (!m) {
			//console.log('- roll check did not find anyone that', res.postAs ? res.postAs.name : req.message.member.displayName, 'matched.');
			return;
		}

		key = key.toLowerCase();

		// we got a match, let's add it
		const name = res.postAs?.name || req.message.member.displayName;

		// are we replacing a roll that's already happened?
		let r =  _.find( call.rolls, function(r) { return r.key == key; });

		// remove it if it exists
		if (r) {
			call.rolls = _.without(call.rolls, r);
		}
		
		r = {
			key: key,
			name: name,
			from: req.message.author.username,
			count: r ? r.count + 1 : 1,
			text: roll.parts.join(' ') + ' = ' + roll.result + (r?.count >= 1 ? '*' : '' ),
			roll: typeof roll.result == 'string' ? parseInt( roll.result ) : roll.result
		};
		

		call.rolls.push( r );
		if (!call.logs) call.logs = [];
		call.logs.push('- **' + name + '** (' + req.message.author.username + ') rolled ' + roll.text);

		call.save( req );

		// update the embed
		if (call.message) {
			const em = call.generateEmbed( req );

			const m = await req.channel.messages.fetch( call.message );
			await m.edit('', em);

			// delete the roll
			try {
				req.message.delete({timeout: 500, reason: 'gobbled by rodbot call'});
			} catch(e) {
				console.log('- failed to delete message in call middleware');
			}

			res.sent = true;
		}
	}

}

export default CallMiddleware;