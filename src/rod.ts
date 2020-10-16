import Secrets from './secrets.json';
import Discord from 'discord.js';
import mongoose from 'mongoose';
import async from 'async';
import RodRequest from './lib/rodRequest';

/**
 * The new Rod structure is loosely based on Express.js
 * Each message can be handled by "middleware", and ultimately ends up routed to a specific handler (or none at all)
 * For example, aliasing would be handled by middleware, and a roll would be handled by the roll handler
 * Each middleware or handler is sent the original message object, and a response object, which is built up by the handlers.
 */
class Rod {

	/**
	 * Connects to discord, parses input flags, set up event handlers
	 */
	constructor() {
		const self = this;
		console.log('- hello from rod');

		// parse argument flags i.e. "node rod.js key=value"
		const flags = {};
		for (let i = 2; i < process.argv.length; i++) {
			const a = process.argv[i].split('=');
			flags[a[0]] = a[1] || true;
		}
		console.log('- flags:', flags);

		self.connectToMongo();
		self.connectToDiscord();
	}

	/**
	 * Connects to discord using the token from `secrets.json` and adds message handler
	 */
	public connectToDiscord() {
		const self = this;

		const client = new Discord.Client();
		console.log('- connecting bot - shard: ', client.shard ? client.shard.ids : 'unsharded');

		client.on('ready', () => {
			console.log(`Logged in as ${client.user.tag}!`);
		});

		client.on('message', msg => {
			try {
				self.handleMessage(msg);
			} catch(e) {
				console.error('- handle message error:', e);
			}
		});
		client.on('error', e => {
			console.error('- discord error:', e);
		});

		client.login(Secrets.discordToken);
	}

	/**
	 * Connects to mongo using mongoose
	 */
	public connectToMongo() {
		// @ts-ignore
		// ^ Secrets file json structure might be different depending on install type
		mongoose.connect(Secrets.mongo.connectionString || `mongodb://${Secrets.mongo.user}:${Secrets.mongo.password}@${Secrets.mongo.host}/${Secrets.mongo.db}`, {
			useNewUrlParser: true,
			useUnifiedTopology: true
		}).then(() => {
			console.log('- connected to mongo');
		}).catch(err => {
			console.error('- mongo connection err:', err);
		});
	}

	/**
	 * Overall handler for messages. Creates response object, runs middleware, and runs handler
	 * @param msg - The discord message object
	 */
	public async handleMessage( msg: Discord.Message ) {
		if (msg.author.bot && !msg.content.startsWith('/rod-bot/')) return; // ignore bots unless they specifically bypass that to talk to us
		if (msg.content.startsWith('(') && msg.content.endsWith(')')) return; // ignore parenthetical messages
		if (msg.content.startsWith('/rod-bot/')) msg.content = msg.content.replace('/rod-bot/', ''); // if bypass bot check, then remove that from content

		if (msg.content === '/ping') {
			console.log(msg);
			msg.reply('pong');
		}

		const req = new RodRequest( msg );
		await req.loadRodData();
		req.parseMessage();
	}

}

const rod = new Rod();

export default rod;