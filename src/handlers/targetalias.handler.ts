import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import _ from 'lodash';


class TargetAlias extends Handler {
	static commands = ['setaliaschannel', 'settarget', 'settargetchannel'];

	/**
	 * Sets a new target channel for alias use in this channel
	 * @param req
	 * @param res
	 */
	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to change this channel\'s alias target.');

		// are we turning it off?
		if (['none', 'here', 'off'].includes( req.parts[0] )) {
			// we're turning it off
			const channelTargets = req.server.channelAliasTargets || {};
			channelTargets[req.message.channel.id] = null;

			req.server.channelAliasTargets = channelTargets;
			req.server.markModified('channelAliasTargets');
			await req.server.save();
			return await res.sendSimple('This channel\'s alias target has been removed and all aliased messages will appear here.');
		}

		// let's find the mentioned channel
		const channels = req.message.mentions.channels;
		if (!channels.size) return await res.sendSimple('You need to mention the target channel', '`' + req.esc + 'settargetchannel #my-target-channel`');
		if (channels.size > 1) return await res.sendSimple('You mentioned more than one target channel and that is confusing. Just target one.');

		const channel = channels.first();

		// do we have permissions to manage this at target channel?
		const perms = channel.permissionsFor( req.guser );
		if (perm != 'admin' && !perms.has('MANAGE_MESSAGES')) return await res.sendSimple('You have permissions to manage Rod here, but not at the target channel, and you need both.');

		// we're good, let's do it
		const channelTargets = req.server.channelAliasTargets || {};
		channelTargets[ req.message.channel.id ] = channel.id;

		req.server.channelAliasTargets = channelTargets;
		req.server.markModified( 'channelAliasTargets' );
		await req.server.save();

		res.sendSimple('Saved! Now all aliases messaging from this channel will display in <#' + channel.id + '>.');

	}

}

export default TargetAlias;