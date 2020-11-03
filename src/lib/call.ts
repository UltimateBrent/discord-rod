import Discord from 'discord.js';
import _ from 'lodash';
import RodRequest from './rodRequest';

class Call {
	public message: string; // Discord.Message.id
	public channel: string; // Discord.Channel.id
	public name: string;
	public text: string;
	public start: Date;
	public completed: boolean = false;
	public mentions: {id:string, name:string}[] = [];
	public npcs: string[] = [];
	public rolls: {
		key: string,
		name: string,
		text: string,
		roll: number,
		from: string,
		count: number
	}[] = [];
	public logs: string[] = [];

	/**
	 * Creates a call object based on a rollCalls entry from the server object
	 * @param call - object from server record
	 * @return the call
	 */
	constructor(call: any) {
		const self = this;

		if (call.message) self.message = call.message;
		if (call.channel) self.channel = call.channel;
		if (call.name) self.name = call.name;
		if (call.text) self.text = call.text;
		if (call.start) self.start = call.start;
		if (call.completed) self.completed = call.completed;
		if (call.mentions) self.mentions = call.mentions;
		if (call.npcs) self.npcs = call.npcs;
		if (call.rolls) self.rolls = call.rolls;
		if (call.logs) self.logs = call.logs;
	}

	/**
	 * Generates the embed for the call with current rolls and status
	 * @param req - the rod request for context and server settings
	 * @return the embed
	 */
	public generateEmbed(req: RodRequest): Discord.MessageEmbed {
		const self = this;

		const em = new Discord.MessageEmbed();
		em.setAuthor( self.name, 'https://cdn.discordapp.com/attachments/368510638160347148/369222455673225217/d20.png' );
		em.setDescription( self.text );
		em.setColor( '#333399' );

		// sort the rolls
		self.rolls = _.sortBy( self.rolls, function(r) { return r.roll * -1; });

		// add the rolls
		for (const roll of self.rolls) {
			em.addField( roll.name, roll.text, true);
		}

		// figure out remaining rolls
		const keys = _.map( self.rolls, 'key' );

		// get the members that are remaining
		let remaining = _.map( _.filter( self.mentions, function(m) { return !keys.includes( 'm' + m.id ) && !keys.includes( 'n' + m.name.toLowerCase()); }), 'name');

		// get the monsters remaining
		remaining = remaining.concat(_.filter(self.npcs, function(m) { return !keys.includes( 'n' + m.toLowerCase() ); }) );

		if (remaining.length) {
			em.setFooter( 'Still waiting on: ' + remaining.join(', ') );
		} else {
			em.setFooter( 'Rolls done! Type `' + req.server.esc + 'calldone` to end, or `' + req.server.esc + 'calladd` more participants.' );
		}


		return em;
	}

	/**
	 * Saves the current call into the server object
	 * @param req - the rod request with the server info on it
	 */
	public async save( req: RodRequest ): Promise<void> {
		const self = this;

		// create the call object
		const call = {
			message: self.message,
			channel: self.channel,
			name: self.name,
			text: self.text,
			start: self.start,
			completed: self.completed,
			mentions: self.mentions,
			npcs: self.npcs,
			rolls: self.rolls,
			logs: self.logs
		};

		if (!req.server.rollCalls) req.server.rollCalls = [];

		// remove the old one if it's there
		const old: any = _.find(req.server.rollCalls, function (c) { return c.channel == self.channel; });
		if (old) old.remove(); // mongoose subdocs get finicky if you replace with similar contents so we can't just remove from array
		req.server.markModified('rollCalls');

		// now add it
		req.server.rollCalls.push( call );
		req.server.markModified('rollCalls');
		req.server = await req.server.save();

		return;
	}

}

export default Call;