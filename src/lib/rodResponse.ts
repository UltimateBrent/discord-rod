import Discord from 'discord.js';
import RodRequest from './rodRequest';
import Alias from '../lib/alias';
import Roll from './roll';

class RodResponse {
	req: RodRequest;
	sent: boolean = false;
	shouldSend: boolean = false;
	alias: Alias;
	postAs?: {
		name: string,
		avatar: string
	};
	roll: Roll;
	errors: string[] = [];
	content?: string;
	embedContent?: string;
	embedColor?: string;
	embedFooter?: string;
	embed?: Discord.MessageEmbed;
	embeds?: Discord.MessageEmbed[];

	constructor( req: RodRequest ) {
		this.req = req;
	}

	/**
	 * Escapes bad thinks like `@everyone` or `@here`
	 * @param content - the string to escape
	 * @returns the escaped string
	 */
	private escape( content: string) : string {
		if (!content) return null;
		return (content + '').replace(/@(everyone|here|channel|testescape)/, '©$1');
	}

	/**
	 * Sends a message without trying to use webhooks, mostly errors and feedback
	 * @param content - the message content to send
	 * @param embedContent - (optional) array of discord embeds, or embed content string
	 * @param options - (optional) options flags
	 * @return message response promise for catching/awaiting
	 */
	async sendSimple( content: string, embedContent: string|Discord.MessageEmbed[] = null, options: {deleteCommand?: boolean, deleteMessage?: boolean, split?: {}} = {} ): Promise<Discord.Message|any> {
		const self = this;
		this.sent = true;

		let embeds: Discord.MessageEmbed[] = [];
		if (typeof embedContent == 'string') {
			const em = new Discord.MessageEmbed();
			em.setDescription( embedContent );
			em.setColor( '#FFFF00' );
			embeds = [ em ];
		} else {
			embeds = embedContent;
		}

		if (options.deleteCommand) this.req.message.delete().catch(e => { console.log('- failed to delete original message from send simple:', e); });
		
		// escape bad things
		content = self.escape( content );

		// determine if we need to split
		const splits = Discord.Util.splitMessage(content, options.split || {maxLength: 2000});
		
		if (splits.length < 2) {
			const m = await this.req.message.channel.send({content, embeds});

			if (options.deleteMessage) m.delete().catch(e => { console.log('- failed to delete temp message from send simple:', e); });

			return m;

		} else {
			for (const m of splits) {
				await this.req.message.channel.send(m);
			}
			return;
		}
	}

	/**
	 * Sends the current response object
	 * @param content - specific content to send as the message beyond what's already stored here
	 * @param options - options flags
	 */
	async send( content: string = null, options: any = {} ): Promise<Discord.Message|any> {
		const self = this;

		// mark this as sent so we don't try again
		self.sent = true;

		// if alias is set, and no postas, use that
		if (self.alias && !self.postAs) {
			//console.log('- setting postas from:', self.alias.name, self.alias.avatar);
			self.postAs = {
				name: self.alias.name,
				avatar: self.alias.avatar
			};
		}

		// is this a pm?
		if (typeof self.req.channel['fetchWebhooks'] !== 'function' && !self.req.channel.parent) { // direct messages don't have webhooks
			content = self.embedContent || content || self.req.message.content;
			let embed = null;

			if (self.postAs) {
				const em = new Discord.MessageEmbed();
				em.setDescription('Direct messages cannot have webhooks, so I cannot alias your message.');
				em.setColor('#993333');
				embed = em;
			} else {
				const em = new Discord.MessageEmbed();
				em.setDescription(content);
				em.setColor((self.embedColor || '#333333') as Discord.ColorResolvable);
				embed = em;
				content = ' ';
			}

			return self.sendSimple(self.escape( content ) || '', [embed]).catch(console.log);
		}

		const hooks = await self.req.getWebhooks( true );

		// let's see if we're in a fail state
		if (!hooks.size && self.postAs) {
			return await self.sendSimple( 'You just tried to alias yourself as `' + self.postAs.name + '` in a channel with no webhooks. We already tried to create them and failed, so this is most likely a permissions issue. Please make sure Rod has the `Manage Webhooks` permission.' );
		}

		if (!hooks.size && self.errors.length) {
			self.sendSimple( self.errors.join('; ') );
			return;
		}

		if (!hooks.size) {
			return self.sendSimple( self.embed?.description || self.embedContent || content || 'Error: You somehow have sent a message with no content and Rod didn\'t figure out why before now. Not great.' );
		}

		// prep postAs
		const username = self.postAs?.name || self.req.message.member?.nickname || self.req.message.author.username;
		const avatar = self.postAs ? self.postAs.avatar || '' : self.req.message.author.avatarURL({ dynamic: true });


		// get the hook
		let hook = hooks.first(); // by default, take the first one
		
		// due to weird android bugs, we want to alternate the webhook if this message is from a different author, otherwise they get merged
		if (hooks.size > 1 && self.req.server.lastMessages && self.req.server.lastMessages[self.req.channel.id]) {
			const lm = self.req.server.lastMessages[self.req.message.channel.id];
			//console.log('- checking last message', lm, hook.id);

			if (lm.name != username && lm.webhook == hook.id) {
				//console.log('- switching hooks');
				hook = hooks.last(); // if it's a different name and same hook, use the other hook
			} else
			if (lm.name == username && lm.webhook != hook.id) {
				//console.log('- maintaining alt hook', lm.webhook);
				hook = hooks.get(lm.webhook);
				if (!hook) hook = hooks.first(); // just in case they were deleted or something
			}
		}

		// build the embed if necessary
		let embeds = [];
		if (self.embeds) embeds = self.embeds;
		if (self.embed) embeds.push( self.embed );
		if (self.embedContent) {
			const em = new Discord.MessageEmbed();
			em.setDescription( self.embedContent);
			em.setColor( (self.embedColor || RodResponse.ColorFromString(username || self.req.message.author.id)) as Discord.ColorResolvable);
			if (self.embedFooter) {
				em.setFooter( self.embedFooter );
			}
			embeds.push( em );
		}
		if (self.errors) {
			for (const err of self.errors) {
				const em = new Discord.MessageEmbed();
				em.setColor( '#FFFF00' );
				em.setDescription( err );
				embeds.push( em );
			}
		}

		if (!content && !self.content && !embeds?.length) {
			console.log('- empty message not sent to discord');
			return;
		}

		// send it!
		let m: Discord.Message;
		try {
			m = await hook.send( {
				content: self.escape(content || self.content || ''),
				username: username,
				avatarURL: avatar,
				embeds: embeds,
				allowedMentions: {parse: ['roles', 'users']},
				threadId: self.req.channel.isThread() ? self.req.channel.id : null
			}) as Discord.Message;
		} catch(e) {
			console.log('- hook.send error:', e);
			self.req.channel.send( 'Got an error trying to post to webhook: ' + e );
		}

		// update the last messages check on the server object
		if (!self.req.server.lastMessages) self.req.server.lastMessages = {};

		self.req.server.lastMessages[self.req.channel.id] = {
			author: self.req.message.author.id,
			name: username,
			avatar: avatar,
			webhook: hook.id,
			content: self.escape( content || self.content || '' )
		};
		self.req.server.markModified('lastMessages');
		self.req.server.save();

		// delete the original message that sent this as long as target channel is this channel
		if (self.req.channel.id != self.req.message.channel.id) return;
		self.req.message.delete().catch(e => {
			//console.log('- message delete failed:', e);
		});

		return m;
	}

	/**
	 * Generates a random color based on a given seed string. Used for colorizing embeds based on username
	 * @param str - the seed string
	 * @return the color string
	 */
	static ColorFromString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}

		const c = (hash & 0x00FFFFFF)
			.toString(16)
			.toUpperCase();

		return '#' + "00000".substring(0, 6 - c.length) + c;
	}
}

export default RodResponse;