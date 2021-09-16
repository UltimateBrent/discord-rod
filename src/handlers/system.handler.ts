import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import _ from 'lodash';

/**
 * Handles functions related to rod itself like debug or escaping
 * - structure is very similar to MultiCommandHandler, but uses the first parameteter instead of the command, since the command is always `rod`
 */
class SystemHandler extends Handler {

	static commands = ['rod']; // all of these are rod prefixed

	static multiCommands: Map<string, string[]> = new Map([
		['setescape', ['setescape']],
		['resetescape', ['resetescape']],
		['listignore', ['listignore', 'ignore']],
		['addignore', ['addignore']],
		['remignore', ['remignore']],
		['clearignore', ['clearignore']],
		['serverinfo', ['serverinfo', 'info']],
		['debug', ['debug']],
		['test', ['testo']],
		['init', ['init']]
	]);

	static async process(req: RodRequest, res: RodResponse): Promise<void> {
		const self = this;

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// do we have permission?
		const perm = req.getPermissions();
		if (perm != 'admin') return await res.sendSimple('You do not have permission to run system commands.');


		// which command type did we get?
		for (const [f, subcommands] of self.multiCommands) {
			if (subcommands.includes(req.parts[0])) return self[f](req, res);
		}

		// if we got this far, we don't have a subhandler for whatever they sent. Just ignore it.
		req.command = null;
	}

	/**
	 * Just here because people keep calling it.
	 */
	static async init(req: RodRequest, res: RodResponse): Promise<void> {
		console.log('- rod init');
		return await res.sendSimple('Hey! You don\'t have to do this anymore, but people kept getting confused when I did not answer at all, so how are you today?');
	}

	/**
	 * Changes the server's escape character
	 * @example `/rod setescape ~`
	 * @param req
	 * @param res
	 */
	static async setescape(req: RodRequest, res: RodResponse): Promise<void> {

		console.log('- server ', req.server.name, 'changing escape');

		console.log(req.parts);

		const newesc = req.parts[1];

		if (!newesc) return await res.sendSimple('No escape character sent. Allowed Escapes:', '`! | / \\ + - $ % ^ & * , . < > : ;`');
		if (newesc.length > 1) return await res.sendSimple('Error: new escape character can only be one character. Not changed.');
		if (!newesc.match(/[!|/\\+\-$%^&*,.<>:;]/)) return await res.sendSimple('Error: new escape character not allowed. Not changed.');

		console.log('- will change to', newesc);

		req.esc = newesc;
		req.server.esc = newesc;
		//rod.serverCache[ server.id ] = server;
		await req.server.save();

		return await res.sendSimple('Your escape character has been changed to `' + req.esc + '` If you did this on accident or somehow have set to something unreachable, you can use `/rod resetescape`');
	}

	/**
	 * Resets the server's escape character to default ( usually `/` )
	 * @example `/rod resetescape`
	 * @param req
	 * @param res
	 */
	static async resetescape(req: RodRequest, res: RodResponse): Promise<void> {
		console.log('- server ', req.server.name, ' resetting escape');

		req.esc = null;
		//rod.serverCache[ server.id ] = server;
		await req.server.save();

		return await res.sendSimple('Your escape character has been changed back to `.`');
	}

	/**
	 * Lists the current server's ignore characters for Rod
	 * @example `/rod listignore`
	 * @param req
	 * @param res
	 */
	static async listignore(req: RodRequest, res: RodResponse): Promise<void> {
		if (!req.server.ignorePrefixes?.length) return await res.sendSimple('Your server does not have any ignore prefixes configured. You can do so with `/rod addignore`');

		return await res.sendSimple('Your ignore prefixes are below:', '`' + req.server.ignorePrefixes.join('`, `') + '`');
	}

	/**
	 * Adds an ignore character to the server, as in, if a message starts with it, Rod will not process it.
	 * @example `/rod addignore ~`
	 * @param req
	 * @param res
	 */
	static async addignore(req: RodRequest, res: RodResponse): Promise<void> {

		const char = req.parts[1];

		if (!char) return await res.sendSimple('You must provide a prefix to be ignored.', 'Ex. `/rod addignore ~`');

		if (!req.server.ignorePrefixes) req.server.ignorePrefixes = [];
		req.server.ignorePrefixes.push( char.trim() );
		await req.server.save();

		return await res.sendSimple('Your prefix was added:', '`' + req.server.ignorePrefixes.join('`, `') + '`');
	}

	/**
	 * Removes an ignore character from the server.
	 * @example `/rod remignore ~`
	 * @param req
	 * @param res
	 */
	static async remignore(req: RodRequest, res: RodResponse): Promise<void> {
		const char = req.parts[1];

		if (!char) return await res.sendSimple('You must provide a prefix to be removed.', 'Ex. `/rod remignore ~`');

		if (!req.server.ignorePrefixes.includes(char)) return await res.sendSimple('That prefix is not being ignored:', '`' + req.server.ignorePrefixes.join('`, `') + '`');

		req.server.ignorePrefixes = _.without( req.server.ignorePrefixes, char);
		await req.server.save();

		return await res.sendSimple('Your prefix was removed:', req.server.ignorePrefixes.length ? '`' + req.server.ignorePrefixes.join('`, `') + '`' : 'No prefixes remain.');
	}

	/**
	 * Clears all the ignore characters on the server
	 * @example `/rod clearignore`
	 * @param req
	 * @param res
	 */
	static async clearignore(req: RodRequest, res: RodResponse): Promise<void> {
		req.server.ignorePrefixes = [];
		await req.server.save();

		return await res.sendSimple('Your ignore prefixes have been cleared:', req.server.ignorePrefixes.length ? '`' + req.server.ignorePrefixes.join('`, `') + '`' : 'No prefixes remain.');
	}

	/**
	 * Prints out information about the current server for debugging
	 * @example `/rod serverinfo`
	 * @param req
	 * @param res
	 */
	static async serverinfo(req: RodRequest, res: RodResponse): Promise<void> {
		// send the info
		const em = new Discord.MessageEmbed();
		em.setAuthor(req.message.guild.name, req.message.guild.iconURL());
		em.setDescription('Server ID: **' + req.message.guild.id + '**\nChannel ID: **' + req.message.channel.id + '**');
		em.addField('Members', req.message.guild.memberCount.toString(), true);
		em.addField('Since', new Date(req.message.guild.createdAt).toISOString().split('T')[0], true);
		em.addField('Escape Char', '`' + req.esc + '`', true);
		em.addField('Ignore Char', req.server.ignorePrefixes.length ? '`' + req.server.ignorePrefixes.join('` `') + '`' : 'none', true);
		em.setColor('#FF3333');

		res.embed = em;
		res.shouldSend = true;
	}
	
	/**
	 * Prints debug messages out to help ascertain why Rod might not be working correctly.
	 * - Tests if Rod can post at all
	 * - If Rod can post an embed
	 * - If Webhooks are available
	 */
	static async debug(req: RodRequest, res: RodResponse): Promise<void> {
		await res.sendSimple('`1.` You have activated Rod\'s Debugger! Rod is going to make a few posts now. Which ones you see should be reported. :white_check_mark:');

		const em = new Discord.MessageEmbed();
		em.setDescription('`2.` This server/channel/user can show embeds. :white_check_mark:');
		em.setColor('#FF3399');

		await res.sendSimple(null, [em]);
		let hooks = null;
		try {
			hooks = await req.getWebhooks(false);
		// eslint-disable-next-line no-empty
		} catch(e) {}
		if (hooks?.size) {
			await res.sendSimple('`3.` It looks like this channel has webhooks. :white_check_mark:');
		} else {
			await res.sendSimple('`3.` It looks like this channel *does not* have webhooks. We\'re going to try and create them.');

			try {
				const newhooks = await req.getWebhooks(true);
				if (newhooks.size) {
					await res.sendSimple('`3a.` We were able to create some webhooks. :white_check_mark:');
				} else {
					return await res.sendSimple('`3b.` We were *not* able to create any webhooks. This is likely the source of your issues. Rod needs permissions to manage webhooks. :x:');
				}
			} catch(e) {
				return await res.sendSimple('`3c.` We were *not* able to create any webhooks. This is likely the source of your issues. Rod needs permissions to manage webhooks. :x:');
			}
		}
		res.postAs = {
			name: 'Rod Alert!',
			avatar: 'https://rodbot.io/content/images/2018/03/d20_small-1.png'
		}
		await res.send('`4.` Rod can post as a webhook. If you can see numbers `1` through `4`, everything is okay. :white_check_mark:');
	}

	/**
	 * Test features
	 */
	static async test( req: RodRequest, res: RodResponse): Promise<void> {

		const newhooks = await req.getWebhooks();
		console.log(newhooks);

		for (let [key, hook] of newhooks) {
			console.log( key, hook.token );
		}

		await res.sendSimple('Test complete, check console.');

	}
}

export default SystemHandler;