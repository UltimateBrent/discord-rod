import Secrets from './secrets.json';
import Discord from 'discord.js';


class Rod {

	constructor() {
		console.log('- hello from rod');

		// parse argument flags i.e. "node rod.js key=value"
		const flags = {};
		for (let i = 2; i < process.argv.length; i++) {
			const a = process.argv[i].split('=');
			flags[a[0]] = a[1] || true;
		}
		console.log('- flags:', flags);

		const client = new Discord.Client();
		console.log('- connecting bot - shard: ', client.shard ? client.shard.ids : 'unsharded');

		client.on('ready', () => {
			console.log(`Logged in as ${client.user.tag}!`);
		});

		client.on('message', msg => {
			if (msg.content === 'ping') {
				msg.reply('pong');
			}
		});

		client.login( Secrets.discordToken );
	}

}

const rod = new Rod();