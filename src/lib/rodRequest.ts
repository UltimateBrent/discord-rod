import Discord from 'discord.js';
import Rod from '../rod';
import User, { IUser } from '../models/user.model';
import Server, { IServer } from '../models/server.model';
import AliasMiddleware from '../middleware/alias.middleware';
import _ from 'lodash';

/**
 * The request object that's built upon by rod middleware and handlers
 */
class RodRequest {

	public client: Discord.Client;

	public message: Discord.Message;
	public channel: Discord.TextChannel|Discord.ThreadChannel;
	public user: IUser;
	public guser: Discord.GuildMember;
	public server: IServer;

	public esc: string = Rod.defaultEscape;
	public command: string;
	public parts: string[];
	public params: any = {};

	public rollFor: string;

	/**
	 * creates a basic RodRequest from a discord message
	 * @param client - the bot client, for reference to bot user for permissions etc.
	 * @param message - the discord message object
	 */
	constructor(client: Discord.Client, message: Discord.Message) {
		const self = this;

		self.client = client;
		self.message = message;
		if (message.channel.isThread()) {
			self.channel = message.channel as Discord.ThreadChannel;
		} else {
			self.channel = message.channel as Discord.TextChannel;
		}
		self.guser = message.member;

	}

	/**
	 * Parses a message to get the correct command and parameters out
	 * turns `/addnpc bob "Robert Bobby"` to `{command: 'addnpc', params: [bob, 'Robert Bobby']}`
	 */
	public parseMessage() {
		const self = this;

		self.esc = self.server.esc || Rod.defaultEscape;

		// clean smart quotes
		self.message.content = self.message.content.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

		// split the message, minding quotes (like a csv)
		let parts = self.message.content.match(/(?=\S)[^"\s]*(?:"[^\\"]*(?:\\[\s\S][^\\"]*)*"[^"\s]*)*/g);
		if (!parts || !parts.length) return;

		// remove quotes from quoted params
		parts = _.map(parts, function (p) { return p.replace(/^"|"$/g, ''); });

		//console.log('- parts:', parts);

		if (parts[0]?.startsWith(self.esc) || parts[0]?.startsWith('/rod') || parts[0]?.startsWith('.rod')) {
			self.command = parts.shift().slice( self.esc.length );

			// if this isn't an active command, let's reverse this
			if (!Rod.handlerExists(self.command) && !AliasMiddleware.sayCommands.includes(self.command)) {
				parts.unshift( self.esc + self.command );
				self.command = null;
			}

		}

		// parse params
		const params = {};
		for (const p of parts) {
			const a = p.split('=');
			params[a[0]] = a[1]?.replace(/^"|"$/g, '') || true;
		}

		//console.log('- command + params:', self.command, parts, params);
		self.parts = parts;
		self.params = params;
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
	 * Determines permission level of user on this channel.
	 * @return 'admin' | 'channeladmin' | null
	 */
	getPermissions(): string {
		const self = this;

		// guild-level admin, can do everything
		if (self.guser.permissions.has([Discord.Permissions.FLAGS.ADMINISTRATOR])) return 'admin';

		// channel-level admin, can create/edit only their own npcs
		if (self.channel.permissionsFor(self.message.member).has([Discord.Permissions.FLAGS.MANAGE_MESSAGES])) return 'channeladmin';
		
		return null;
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
			let hooks: Discord.Collection<string, Discord.Webhook>;
			if (self.channel.isThread()) {
				hooks = await (self.channel.parent as Discord.TextChannel).fetchWebhooks();
			} else {
				hooks = await (self.channel as Discord.TextChannel).fetchWebhooks();
			}

			// filter out ones that won't work
			for (let [key, hook] of hooks) {
				if (!hook.token) {
					//console.log('- hook had no token:', key, hook);
					hooks.delete( key );
				}
			}

			if (!hooks.size && create) {
				//console.log('- no hooks found, creating...');

				for (let i = hooks.size; i < 2; i++) {
					try {
						const h = await (self.channel as Discord.TextChannel).createWebhook('RoD Hook', {
							avatar: 'https://cdn.discordapp.com/attachments/366690245820940314/438103869600563200/rod-head.png',
							reason: 'Rodbot creating webhook for use with aliasing.'
						});
						hooks.set( 'new' + i, h);
					} catch(e) {
						// unlikely we'll get here if we could fetchWebhooks, but let's be sure
						console.error('- webhook creation error:', e);
						return new Discord.Collection();
					}
				}

			}

			return hooks;

		} catch(e) {
			console.error('- webhook fetching error:', e);
			return new Discord.Collection();
		}

		
	}
}

export default RodRequest;