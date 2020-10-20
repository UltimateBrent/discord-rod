import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import _ from 'lodash';
import async from 'async';


class ListAliases extends Handler {
	static commands = ['listaliases', 'listnpcs', 'list'];

	static async process(req: RodRequest, res: RodResponse): Promise<void> {
		const self = this;

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to list aliases.');

		// get npcs and filter if we're a channel admin
		let ms = req.server.npcs ? req.server.npcs.concat([]) : [];
		ms = _.filter(ms, function (npc) {
			return !(perm == 'channeladmin') || npc.createdBy == req.message.author.id;
		});

		if (!ms.length) return await res.sendSimple('You have no saved npcs.');

		const texts = [];
		for (const m of ms) {

			// do we need to look up grants?
			if (req.params.indexOf('grants') == -1 || (!m.grant?.length && !m.grantRoles?.length)) {

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
		
		return await res.sendSimple( '```css\n## NPCs ##\n```\n' + texts.join('\n') );
	}
}

export default ListAliases;