import Discord from 'discord.js';
import RodRequest from './rodRequest';

class RodResponse {
	req: RodRequest;
	sent: boolean = false;
	postAs?: {
		name: string,
		avatar: string
	};
	errors: string[] = [];
	embedContent?: string;
	embedColor?: string;
	embedFooter?: string;
	embed?: Discord.MessageEmbed;

	constructor( req: RodRequest ) {
		this.req = req;
	}

	/**
	 * Sends a message without trying to use webhooks
	 * @param content - the message content to send
	 * @param embeds - array of discord embeds
	 * @return message response promise for catching/awaiting
	 */
	sendSimple( content: string, embeds: Discord.MessageEmbed[] = [] ): Promise<any> {
		return this.req.message.channel.send( content, embeds );
	}

	/**
	 * Sends the current response object
	 * @param content - specific content to send as the message beyond what's already stored here
	 */
	async send( content: string = null ) {
		const self = this;

		// mark this as sent so we don't try again
		self.sent = true;

		// is this a pm?
		if (typeof self.req.message.channel['fetchWebhooks'] !== 'function') { // direct messages don't have webhooks
			content = self.embedContent || content || self.req.message.content;
			let embed = null;

			if (self.postAs) {
				let em = new Discord.MessageEmbed();
				em.setDescription('Direct messages cannot have webhooks, so I cannot alias your message.');
				em.setColor('#993333');
				embed = em;
			} else {
				let em = new Discord.MessageEmbed();
				em.setDescription(content);
				em.setColor(self.embedColor || '#333333');
				embed = em;
				content = ' ';
			}

			return self.sendSimple(content || '', embed).catch(console.log);
		}

		const hooks = await self.req.getWebhooks( true );

		// let's see if we're in a fail state
		if (!hooks.size && self.postAs) {
			self.sendSimple( 'You just tried to alias yourself as `' + self.postAs.name + '` in a channel with no webhooks. We already tried to create them and failed, so this is most likely a permissions issue. Please make sure Rod has the `Manage Webhooks` permission.' );
			return;
		}

		if (!hooks.size && self.errors.length) {
			self.sendSimple( self.errors.join('; ') );
			return;
		}

		if (!hooks.size) {
			self.sendSimple( self.embed?.description || self.embedContent || content || 'Error: You somehow have sent a message with no content and Rod didn\'t figure out why before now. Not great.' );
			return;
		}

		// prep postAs
		const username = self.postAs?.name || self.req.message.member?.nickname || self.req.message.author.username;
		const avatar = self.postAs?.avatar || self.req.message.author.avatarURL({dynamic: true});


		// get the hook
		let hook = hooks.first(); // by default, take the first one
		
		// due to weird android bugs, we want to alternate the webhook if this message is from a different author, otherwise they get merged
		if (hooks.size > 1 && self.req.server.lastMessages && self.req.server.lastMessages[self.req.message.channel.id]) {
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
		const embeds = [];
		if (self.embed) embeds.push( self.embed );
		if (self.embedContent) {
			const em = new Discord.MessageEmbed();
			em.setDescription( self.embedContent);
			em.setColor( self.embedColor || RodResponse.colorFromString(username || self.req.message.author.id));
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

		// send it!
		try {
			await hook.send(content || '', {
				username: username,
				avatarURL: avatar,
				embeds: embeds
			});
		} catch(e) {
			console.log('- hook.send error:', e);
			self.req.message.channel.send( 'Got an error trying to post to webhook: ' + e );
		}

		// update the last messages check on the server object
		if (!self.req.server.lastMessages) self.req.server.lastMessages = {};

		self.req.server.lastMessages[self.req.message.channel.id] = {
			author: self.req.message.author.id,
			name: username,
			avatar: avatar,
			webhook: hook.id,
			content: content
		};
		self.req.server.markModified('lastMessages');
		self.req.server.save();

		// delete the original message that sent this
		self.req.message.delete({
			timeout: 1200,
			reason: 'Rod deletes commands after responding to them.'
		});

	}

	/**
	 * Generates a random color based on a given seed string. Used for colorizing embeds based on username
	 * @param str - the seed string
	 * @return the color string
	 */
	static colorFromString(str: string): string {
		let hash = 0;
		for (var i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}

		const c = (hash & 0x00FFFFFF)
			.toString(16)
			.toUpperCase();

		return '#' + "00000".substring(0, 6 - c.length) + c;
	}
}

export default RodResponse;