import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import _ from 'lodash';

/**
 * Handles functions related to rod itself like debug or escaping
 */
class SystemHandler extends Handler {

	static commands = ['rod']; // all of these are rod prefixed

	static EscapeCommands = ['setescape'];
	static ResetEscapeCommands = ['resetescape'];
	static ServerInfoCommands = ['serverinfo', 'info'];
	static DebugCommands = ['debug'];
	
	static subCommands = _.union(
		SystemHandler.EscapeCommands,
		SystemHandler.ResetEscapeCommands,
		SystemHandler.ServerInfoCommands,
		SystemHandler.DebugCommands
	);

	static async process(req: RodRequest, res: RodResponse): Promise<void> {
		const self = this;

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// do we have permission?
		const perm = req.getPermissions();
		if (perm != 'admin') return await res.sendSimple('You do not have permission to run system commands.');

		// which command type did we get?
		if (SystemHandler.EscapeCommands.includes(req.parts[0])) return self.setescape(req, res);
		if (SystemHandler.ResetEscapeCommands.includes(req.parts[0])) return self.resetescape(req, res);
		if (SystemHandler.ServerInfoCommands.includes(req.parts[0])) return self.serverinfo(req, res);
		if (SystemHandler.DebugCommands.includes(req.parts[0])) return self.debug(req, res);

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

		if (!newesc) return await res.sendSimple('No escape character sent. Allowed Escapes:', '`! | / \ + - $ % ^ & * , . < > : ;`');
		if (newesc.length > 1) return await res.sendSimple('Error: new escape character can only be one character. Not changed.');
		if (!newesc.match(/[!|\/\\+\-$%^&*,.<>:;]/)) return await res.sendSimple('Error: new escape character not allowed. Not changed.');

		console.log('- will change to', newesc);

		req.server.esc = newesc;
		//rod.serverCache[ server.id ] = server;
		await req.server.save();

		return await res.sendSimple('Your escape character has been changed to `' + req.server.esc + '` If you did this on accident or somehow have set to something unreachable, you can use `/rod resetescape`');
	}

	/**
	 * Resets the server's escape character to default ( usually `/` )
	 * @example `/rod resetescape`
	 * @param req
	 * @param res
	 */
	static async resetescape(req: RodRequest, res: RodResponse): Promise<void> {
		console.log('- server ', req.server.name, ' resetting escape');

		req.server.esc = null;
		//rod.serverCache[ server.id ] = server;
		await req.server.save();

		return await res.sendSimple('Your escape character has been changed back to `/`');
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
		em.addField('Members', req.message.guild.memberCount, true);
		em.addField('Since', new Date(req.message.guild.createdAt).toISOString().split('T')[0], true);
		em.addField('Owner', req.message.guild.owner.user.username + ' (' + req.message.guild.owner.nickname + ')', true);
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
		em.setDescription('`2.` This server can show embeds. :white_check_mark:');
		em.setColor('#FF3399');

		await res.sendSimple(null, [em]);
		let hooks = null;
		try {
			hooks = await req.getWebhooks(false);
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
			avatar: 'https://cdn.discordapp.com/attachments/784802568643674112/784910116721131551/z.png'
		}
		await res.send('`4.` Rod can post as a webhook. If you can see numbers `1` through `4`, everything is okay. :white_check_mark:');
	}
}

export default SystemHandler;