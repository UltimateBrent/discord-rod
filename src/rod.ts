import Secrets from './secrets.json';
import Discord from 'discord.js';
import mongoose from 'mongoose';
import RodRequest from './lib/rodRequest';
import RodResponse from './lib/rodResponse';
import Handler from './handlers/handler';
import _ from 'lodash';
import fs from 'fs';
import Middleware from './middleware/middleware';

/**
 * The Rod v2 structure is loosely based on Express.js
 * Each message can be handled by "middleware", and ultimately ends up routed to a specific handler (or none at all)
 * For example, aliasing would be handled by middleware, and a roll would be handled by the roll handler
 * Each middleware or handler is sent the original message object, and a response object, which is built up by the handlers.
 * 
 * Invite Link: https://discord.com/oauth2/authorize?client_id=775423644095610911&scope=bot&permissions=536963136
 */
class Rod {

	private handlers: Map<string, typeof Handler> = new Map();
	private middleware: (typeof Middleware)[] = [];
	private flags: any = {};

	public defaultEscape: string = '.';

	public client: Discord.Client;

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
		self.flags = flags;
		console.log('- flags:', flags);

		self.connectToMongo();
		self.connectToDiscord();
		self.loadHandlers();
		self.loadMiddleware();

		// listen for discord API errors
		process.on('unhandledRejection', error => {
			console.error('Unhandled promise rejection:', error);
		});
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
			self.handleMessage(msg).catch(e => {
				console.error('- handle message error:', e);
			});
		});
		client.on('error', e => {
			console.error('- discord error:', e);
		});

		client.login( Secrets[ 'discordToken' + (self.flags.tokenType || '') ] );

		self.client = client;
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
			console.log('- connected to mongo db');
		}).catch(err => {
			console.error('- mongo connection err:', err);
		});
	}

	/**
	 * Loads the handlers
	 */
	public async loadHandlers() {
		const self = this;

		let files: any = fs.readdirSync( './src/handlers' );
		files = _.filter( files, function(f) {
			return f.match(/(.*)\.handler\.ts/);
		});
		console.log('- handlers found:', files);

		for (const f of files) {
			const name = f.replace('.handler.ts', '');
			const h: any = await import( './handlers/' + name + '.handler' );

			const commands: string[] = h.default.commands;
			for( const c of commands) {
				self.handlers.set( c, h.default );
			}

		}

		console.log('- loaded commands:', Array.from( self.handlers.keys() ) );
	}

	/**
	 * Loads the middleware and orders by priority
	 */
	public async loadMiddleware() {
		const self = this;

		let files: any = fs.readdirSync('./src/middleware');
		files = _.filter(files, function (f) {
			return f.match(/(.*)\.middleware\.ts/);
		});
		console.log('- middleware found:', files);

		for (const f of files) {
			const name = f.replace('.middleware.ts', '');
			const h: any = await import('./middleware/' + name + '.middleware');

			self.middleware.push( h.default );
		}

		// sort by priority
		self.middleware = _.sortBy(self.middleware, function(m) {
			return -1 * m.priority;
		});

	}

	/**
	 * Overall handler for messages. Creates response object, runs middleware, and runs handler
	 * @param msg - The discord message object
	 */
	public async handleMessage( msg: Discord.Message ) {
		const self = this;

		if (msg.author.bot && !msg.content.startsWith('|rod-bot|')) return; // ignore bots unless they specifically bypass that to talk to us
		if (msg.content.startsWith('(') && msg.content.endsWith(')')) return; // ignore parenthetical messages
		if (msg.content.startsWith('|rod-bot|')) msg.content = msg.content.replace('|rod-bot|', ''); // if bypass bot check, then remove that from content

		const req = new RodRequest( self.client, msg );
		await req.loadRodData();

		// is this part of our ignore prefixes?
		for (let pre of req.server.ignorePrefixes || []) {
			if (msg.content.startsWith( pre )) return;
		}

		req.parseMessage();
		const res = new RodResponse( req );

		// run middlewares
		if (self.middleware.length) {
			for (const mware of self.middleware) {
				if (mware.priority >= 0) await mware.process( req, res );
			}
		}

		// run handler (if any)
		if (req.command && !res.sent) {

			// do we have a handler for this command?
			const h: typeof Handler = self.handlers.get(req.command);
			if (h) {
				await h.process( req, res );
			} else {
				console.log('- no handler for command:', req.command);
				res.sendSimple('No such command: `' + req.command + '`');
				req.command = null;
			}

		}

		// run after middlewares (negative priority)
		if (self.middleware.length) {
			for (const mware of self.middleware) {
				if (mware.priority < 0) await mware.process(req, res);
			}
		}

		// send it
		try {
			if (!res.sent && (res.shouldSend || req.command)) await res.send();
		} catch(e) {
			res.sendSimple( e );
		}
	}

}

const rod = new Rod();

export default rod;