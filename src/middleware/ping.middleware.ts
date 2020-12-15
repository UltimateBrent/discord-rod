import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Middleware from '../middleware/middleware';
import _ from 'lodash';

/**
 * Checks any active pings/dones that this message satisfies
 */
class PingMiddleware extends Middleware {

	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// don't process in a DM
		if (!req.channel.guild) return;


		// is this satisfying any current pings?
		const pings: any = _.filter(req.server.pings, function (p) {
			if (p.channel != req.message.channel.id) return false; // is this the right channel?
			if (!p.mentions || !p.mentions.length) return true;

			// check the mentions
			return _.find(p.mentions, function (m) {
				return m.id == req.message.author.id;
			});
		});

		// we found some, let's kill them
		if (pings.length) {
			console.log('- found', pings.length, 'relevant pings.');
			_.each(pings, function (p) {
				req.message.channel.messages.fetch(p.message).then(function (m) {
					setTimeout(function () {
						m.delete().catch(console.error);
					}, 300);
				});
				req.server.pings = _.without(req.server.pings, p);
			});

			//rod.serverCache[ server.id ] = server;
			await req.server.save(); // await this one because it might overlap with the below
		}

		// Now let's check for `/done` messages, but only if we have permission
		const perm = req.getPermissions();
		if (!perm) return;

		
		const dones = _.filter(req.server.dones, function (s) {
			return s.channel == req.message.channel.id;
		});

		if (!dones.length) return; // there weren't any to delete

		//console.log('- dones found:', dones);
		_.each(dones, function (d) {
			req.message.channel.messages.fetch(d.message).then(function (m) {
				setTimeout(function () {
					m.delete();
				}, 300);
			});
			req.server.dones = _.without(req.server.dones, d);
		});

		req.server.save();
		
	}

}

export default PingMiddleware;