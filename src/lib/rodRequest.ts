import Discord from 'discord.js';
import User, { IUser } from '../models/user.model';
import Server, { IServer } from '../models/server.model';
import _ from 'lodash';
import async from 'async';

/**
 * The request object that's built upon by rod middleware and handlers
 */
class RodRequest {

	public message: Discord.Message;
	public user: IUser;
	public guser: Discord.GuildMember;
	public server: IServer;

	public command: string;
	public params: string[];

	/**
	 * creates a basic RodRequest from a discord message
	 */
	constructor(message: Discord.Message) {
		const self = this;

		self.message = message;
		self.guser = message.member;

	}

	/**
	 * Parses a message to get the correct command and parameters out
	 * turns `/addnpc bob "Robert Bobby"` to `{command: 'addnpc', params: [bob, 'Robert Bobby']}`
	 */
	parseMessage() {
		const self = this;

		if (!self.server.esc) self.server.esc = '.';

		// clean smart quotes
		self.message.content = self.message.content.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

		// split the message, minding quotes (like a csv)
		let parts = self.message.content.match(/(?=\S)[^"\s]*(?:"[^\\"]*(?:\\[\s\S][^\\"]*)*"[^"\s]*)*/g);
		if (!parts || !parts.length) return;

		// remove quotes from quoted params
		parts = _.map(parts, function (p) { return p.replace(/^"|"$/g, ''); });

		console.log('- parts:', parts);

		if (parts[0]?.startsWith( self.server.esc )) {
			self.command = parts.shift().slice( self.server.esc.length );

			if (self.command == 'rod') { // for instances like `/rod command param1 param2`
				self.command = parts.shift(); 
			}
		}

		console.log('- command + params:', self.command, parts);
		self.params = parts;
	}

	/**
	 * load stored values/settings from Rod's database
	 */
	async loadRodData() {
		const self = this;

		
		const u = User.GetFromID( self.message.author, self.message.guild ? self.message.guild.id : null );
		const s = Server.GetFromGuild( self.message.guild );

		[self.user, self.server] = await Promise.all([u, s]);

		return;
	}

	/**
	 * Gets webhooks for message channel, or creates them if able
	 * - we create two webhooks to deal with an android bug where posts to the same webhook, even if they had different authors, would be merged.
	 * @param create - Whether or not to create new webhooks
	 * @return the collection of webhooks, if any
	 */
	async getWebhooks( create: boolean = false): Promise<Discord.Collection<string, Discord.Webhook>> {
		const self = this;

		try {
			const hooks = await (self.message.channel as Discord.TextChannel).fetchWebhooks();
			if (!hooks.size && create) {
				console.log('- no hooks found, creating...');

				for (let i = hooks.size; i < 2; i++) {
					try {
						const h = await (self.message.channel as Discord.TextChannel).createWebhook('RoD Hook', {
							avatar: 'https://cdn.discordapp.com/attachments/366690245820940314/438103869600563200/rod-head.png',
							reason: 'Rodbot creating webhook for use with aliasing.'
						});
						hooks.set( 'new' + i, h);
					} catch(e) {
						console.error('- webhook creation error:', e);
						throw new Error( 'Error creating webhooks. Most likely reason is insufficient permissions. Please make sure Rod has the `Manage Webhooks` permssion. ' );
					}
				}

			}

			return hooks;
			
		} catch(e) {
			console.error('- webhook fetching error:', e);
			throw new Error('Error fetching webhooks. Most likely reason is insufficient permissions. Please make sure Rod has the `Manage Webhooks` permssion. ');
		}

		
	}
}

export default RodRequest;