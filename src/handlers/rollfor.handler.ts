import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Roll from '../lib/roll';


class RollForHandler extends Handler {

	static commands: string[] = ['rollfor'];

	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to roll for other people.');

		// let's set the rollfor values
		req.rollFor = req.parts[0];
		res.alias = null;
		res.postAs = {
			name: req.rollFor,
			avatar: 'https://cdn.discordapp.com/attachments/368510638160347148/369222455673225217/d20.png'
		};

		// check roll calls
		// TODO call the roll call check

		const roll: Roll = Roll.parseRoll( req, req.parts.slice(1).join(' ') );
		console.log('- process roll:', roll);

		if (roll.errors.length) {
			res.errors = res.errors.concat( roll.errors );
		} else {
			res.roll = roll;
		}
		res.embedContent = roll.text;
	}
}

export default RollForHandler;