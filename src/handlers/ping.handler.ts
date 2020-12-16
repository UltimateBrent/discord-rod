import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import _ from 'lodash';

class PingHandler extends MultiCommandHandler {
	
	static multiCommands = new Map([
		['ping', ['ping']],
		['turn', ['turn']],
		['done', ['done', 'end', 'endturn']],
		['clearpings', ['clearpings']]
	]);

	/**
	 * Sets up a ping either directed at anyone or at a specific user/role
	 * @example `/ping @Brent I need you to send me your character sheet.`
	 * @param req
	 * @param res
	 */
	static async ping(req: RodRequest, res: RodResponse): Promise<void> {

		// what's the message
		let text = req.message.content.replace(req.server.esc + 'ping ', '');

		// who was mentioned?
		let mentions = req.message.mentions.members.size ? _.map(req.message.mentions.members.array(), function (m) { return { id: m.id, name: m.displayName }; }) : [];

		let roles = req.message.mentions.roles.size ? _.map(req.message.mentions.roles.array(), function (r) { return { id: r.id, name: r.name }; }) : [];

		req.message.mentions.roles.forEach(function (r) {
			mentions = mentions.concat(_.map(r.members.array(), function (m) { return { id: m.id, name: m.displayName }; }));
		});

		mentions = _.uniq(mentions);
		roles = _.uniq(roles);

		console.log(mentions, roles);

		_.each(mentions, function (m) {
			text = text.replace('<@!' + m.id + '>', '@' + m.name);
			text = text.replace('<@' + m.id + '>', '@' + m.name);
		});

		_.each(roles, function (m) {
			text = text.replace('<@&' + m.id + '>', '@' + m.name);
		});

		const em = new Discord.MessageEmbed();
		em.setTitle(text);
		em.setDescription(' ');
		em.setColor('#333399');
		em.setFooter(mentions.length ? 'This message will auto-delete once the @mentioned posts.' : 'This message will auto-delete once anyone posts.');
		const message: Discord.Message = await res.sendSimple('', [em], { deleteCommand: true }); // we send a "simple" message rather than a webhooked one so we can edit it

		req.server.pings.push( {
			message: message.id,
			channel: req.channel.id,
			author: req.user.id,
			text: text,
			mentions: mentions
		});


		await req.server.save();

		// make sure we don't do a normal response
		res.sent = true;
	}

	/**
	 * Sets up a ping to notify someone it is their turn with an automatic message.
	 * @example `/turn @Brent`
	 * @param req
	 * @param res
	 */
	static async turn(req: RodRequest, res: RodResponse): Promise<void> {
		if (req.message.content.trim() == req.server.esc + 'turn') {
			req.message.content = req.server.esc + 'ping It is time for the next turn!';
		} else {
			req.message.content = req.server.esc + 'ping It is your turn ' + req.message.content.replace(req.server.esc + 'turn ', '') + '!';
		}

		return PingHandler.ping(req, res);
	}

	/**
	 * Sets up a ping specifically announcing to the DM that you are done with your turn
	 * @example `/done`
	 * @param req
	 * @param res
	 */
	static async done(req: RodRequest, res: RodResponse): Promise<void> {

		const em = new Discord.MessageEmbed();
		em.setTitle('**I am done with my turn!**');
		em.setDescription(' ');
		em.setColor('#333399');
		em.setFooter('This message will auto-delete once the DM posts.');
		const message: Discord.Message = await res.sendSimple('', [em], { deleteCommand: true }); // we send a "simple" message rather than a webhooked one so we can edit it

		req.server.dones.push({
			message: message.id,
			channel: req.channel.id,
			author: req.user.id
		});


		await req.server.save();

		// make sure we don't do a normal response
		res.sent = true;
	}

	/**
	 * Clears any active pings for the `@mentioned` or all of them if no mentions.
	 * @example `/clearpings @Brent`
	 * @param req
	 * @param res
	 */
	static async clearpings(req: RodRequest, res: RodResponse): Promise<void> {

	}
}

export default PingHandler;