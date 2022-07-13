import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import _ from 'lodash';
import Call from '../lib/call';


class CallHandler extends MultiCommandHandler {

	static multiCommands = new Map([
		['callfor', 	['call', 'callfor']],
		['add', 		['calladd', 'addtocall']],
		['done', 		['calldone', 'endcall', 'callend']],
		['refresh', 	['callrefresh', 'refreshcall']],
		['log',			['calllog']]
	]);

	/**
	 * Grants access to an alias to set of users/roles
	 * @example `/callfor Iniative! You are attacked by Goblins, roll initiative! @party +Goblins`
	 * @param req
	 * @param res
	 */
	static async callfor(req: RodRequest, res: RodResponse): Promise<void> {

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to start calls.');

		// check if there are any active calls
		if (Call.GetActiveCall( req )) {
			return await res.sendSimple('You already have an active call in this channel.', 'Ends calls with `' + req.esc + 'calldone`');
		}

		// parse
		const title = req.parts[0];
		const text = req.parts.slice(1).join(' ');

		// who was mentioned?
		let mentions = req.message.mentions.members.size ? _.map(Array.from( req.message.mentions.members.values()), function (m) { return {id: m.id, name: m.displayName}; }) : [];

		// turn role members into members
		if (req.message.mentions.roles.size) {
			for (const role of Array.from( req.message.mentions.roles.values())) {
				console.log('- checking role:', role.name);

				if (role.members.size) mentions = mentions.concat( _.map(Array.from( role.members.values()), function (m) { return { id: m.id, name: m.displayName }; }) );
			}

			// might have double grabbed people from role
			mentions = _.uniq( mentions );
		}

		// any monster mentions? ex. `+Goblin`
		let npcs = [];
		for (let p of req.parts) {
			if (p.charAt(0) == '+') {
				p = p.slice(1);

				// remove quote if it's there
				if (p.charAt(0) == '"') p = p.slice(1);

				npcs.push( p );
			}
		}
		npcs = _.uniq(npcs );
		
		console.log('- found in call:', { mentions, npcs });

		// insert the call
		const call = new Call({
			channel: req.channel.id,
			name: title,
			text: text,
			start: new Date(),
			mentions: mentions,
			npcs: npcs
		});

		const em = call.generateEmbed( req );
		const message: Discord.Message = await res.sendSimple('', [em], {deleteCommand: true}); // we send a "simple" message rather than a webhooked one so we can edit it
		
		call.message = message.id;

		return call.save( req );
	}

	/**
	 * Adds mentioned users +NPCs to the active call
	 * @example `/calladd @Party +Goblin`
	 * @param req
	 * @param res
	 */
	static async add( req: RodRequest, res: RodResponse): Promise<void> {
		// is there an active call?
		const call = Call.GetActiveCall(req);
		if (!call) return await res.sendSimple('There is not currently a roll call active.');

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to add mentions to calls.');

		// who was mentioned?
		let mentions = req.message.mentions.members.size ? _.map(Array.from( req.message.mentions.members.values() ), function (m) { return { id: m.id, name: m.displayName }; }) : [];

		// turn role members into members
		if (req.message.mentions.roles.size) {
			for (const role of Array.from( req.message.mentions.roles.values())) {
				console.log('- checking role:', role.name);

				if (role.members.size) mentions = mentions.concat(_.map(Array.from( role.members.values() ), function (m) { return { id: m.id, name: m.displayName }; }));
			}

			// might have double grabbed people from role
			mentions = _.uniq(mentions);
		}

		// any monster mentions? ex. `+Goblin`
		let npcs = [];
		for (let p of req.parts) {
			if (p.charAt(0) == '+') {
				p = p.slice(1);

				// remove quote if it's there
				if (p.charAt(0) == '"') p = p.slice(1);

				npcs.push(p);
			}
		}
		npcs = _.uniq(npcs);

		console.log('- found in call add:', { mentions, npcs });

		call.mentions = call.mentions.concat( mentions );
		call.npcs = call.npcs.concat( npcs );

		call.save( req );

		// update the embed
		if (call.message) {
			const em = call.generateEmbed(req);

			const m = await req.channel.messages.fetch(call.message);
			await m.edit({content: ' ', embeds: [em]});

			// delete the roll
			try {
				req.message.delete();
			} catch(e) {
				console.log('- failed to delete message in call handler');
			}

			res.sent = true;
		}
	}

	/**
	 * Refreshes the call by posting it again and deleting the old one. Mostly just to move it down the chat.
	 * @param req
	 * @param res
	 */
	static async refresh( req: RodRequest, res: RodResponse ): Promise<void> {
		// is there an active call?
		const call = Call.GetActiveCall(req);
		if (!call) return await res.sendSimple('There is not currently a roll call active.');

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to refresh calls.');

		// delete old post
		const m = await req.channel.messages.fetch(call.message);
		m.delete();

		// make new post
		const em = call.generateEmbed(req);
		const message: Discord.Message = await res.sendSimple('', [em], { deleteCommand: true }); // we send a "simple" message rather than a webhooked one so we can edit it

		call.message = message.id;

		return call.save(req);
	}

	/**
	 * Ends the current active call in the channel and prints the results
	 * @example `/calldone`
	 * @param req
	 * @param res
	 */
	static async done( req: RodRequest, res: RodResponse): Promise<void> {

		// is there an active call?
		const call = Call.GetActiveCall( req );
		if (!call) return await res.sendSimple('There is not currently a roll call active.');

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to end calls.');

		await call.remove( req );

		let results = '**' + call.name + '** complete!\n\n';

		// add rolls
		_.each(_.sortBy(call.rolls, function (r) { return r.roll * -1; }), function (r) {
			results += '**' + r.name + '**: `' + r.roll + '`' + "\n";
		});

		return res.sendSimple('', results, {deleteCommand: true} );
	}

	/**
	 * Prints out the history of rolls for the active call
	 * @example `/calllog`
	 * @param req
	 * @param res
	 */
	static async log(req: RodRequest, res: RodResponse): Promise<void> {

		// is there an active call?
		const call = Call.GetActiveCall(req);
		if (!call) return await res.sendSimple('There is not currently a roll call active.');

		return res.sendSimple('', call.logs.join('\n'), {deleteCommand: true});
	}
}

export default CallHandler;
