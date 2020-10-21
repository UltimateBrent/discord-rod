import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Alias from '../lib/alias';
import _ from 'lodash';


class UseAlias extends Handler {
	static commands = ['usealias', 'use', 'npc', 'say'];

	/**
	 * Lists aliases that the user has access to
	 * @param req - the request
	 * @param res - the response
	 */
	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		const alias = Alias.FindAlias( req, req.parts[0] );
		if (!alias) return await res.sendSimple( 'No such alias exists: `' + req.parts[0] + '`' );

		if (!alias.checkGrant( req )) return await res.sendSimple( 'You don\'t have permission to use that alias. Have an admin use `' + req.server.esc + 'grantalias` for you.' );

		// we're good
		res.alias = alias;
		//console.log('- setting alias to:', alias.id, alias.name);
		
		// remove id from message content and send it
		return await res.send( req.parts.slice(1).join(' ') );
	}

}

export default UseAlias;