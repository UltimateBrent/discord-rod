import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Alias from '../lib/alias';
import _ from 'lodash';


class ListAliases extends Handler {
	static commands = ['listaliases', 'listnpcs', 'list'];

	/**
	 * Lists aliases that the user has access to
	 * @param req - the request
	 * @param res - the response
	 */
	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to list aliases.');

		// are we filtering by a role or user grant?
		let checkUser = null;
		let checkRole = null;
		if (req.message.mentions.users.size || req.message.mentions.roles.size) {
			req.params.grants = true;
			if (req.message.mentions.users.size) checkUser = req.message.mentions.users.first();
			if (req.message.mentions.roles.size) checkRole = req.message.mentions.roles.first();
		}

		//console.log('- listing aliases, grants:', req.params.grants, 'for user:', checkUser, 'and role:', checkRole);

		// get npcs and filter if we're a channel admin
		let ms = req.server.npcs ? req.server.npcs.concat([]) : [];
		ms = _.filter(ms, function (npc) {
			const a = new Alias(npc);
			if (checkUser || checkRole) {
				return a.checkGrant( req ) && a.checkGrant(req, checkUser?.id, checkRole?.id);
			} else {
				return a.checkGrant( req );
			}
		});

		if (!ms.length) return await res.sendSimple(perm ? 'You have no saved aliases.' : 'You do not have access to any aliases.');

		const texts = [];
		for (const m of ms) {

			// do we need to look up grants?
			if (!req.params.grants || (!m.grant?.length && !m.grantRoles?.length)) {

				texts.push( '`' + m.id.toLowerCase() + '`: **' + m.name + '**' );

			} else {

				// look up grants
				const grants: string[] = [];
				if (m.grant?.length) {
					
					for( const g of m.grant) {
						try {
							const u: Discord.GuildMember = await req.message.guild.members.fetch( g );
							grants.push( u.displayName );
						} catch(e) {
							// user might've left the server
							// maybe we should remove them from the grants?
						}
					}
				}

				if (m.grantRoles?.length) {

					for (const g of m.grantRoles) {
						try {
							const r: Discord.Role = await req.message.guild.roles.fetch(g);
							grants.push( r.name );
						} catch (e) {
							// role might not exist anymore
							// maybe we should remove them from the grants?
						}
					}
				}
				
				texts.push( '`' + m.id.toLowerCase() + '`: **' + m.name + '** (' + grants.join(', ') + ')' );
			}

		}
		
		return await res.sendSimple( '```css\n## Aliases ##\n```\n' + texts.join('\n') );
	}
}

export default ListAliases;