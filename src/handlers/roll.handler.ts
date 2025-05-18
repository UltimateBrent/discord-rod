import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import Roll from '../lib/roll';


class RollHandler extends MultiCommandHandler {

	static multiCommands = new Map([
		['roll', ['roll', 'r']],
		['coin', ['coinflip', 'flipacoin', 'coin']]
	]);

	/**
	 * Processes a roll command
	 * @param req - the request
	 * @param res - the response
	 */
	static async roll(req: RodRequest, res: RodResponse): Promise<void> {
		const roll: Roll = Roll.parseRoll( req, req.parts.join(' ') );
		//console.log('- process roll:', roll);

		if (roll.errors.length) {
			res.errors = res.errors.concat( roll.errors );
		}

		if (roll.errors[0] == roll.text) return; // if there's only one error, we're done

		res.roll = roll;
		res.embedContent = roll.text;
	}

	/**
	 * Processes a "coin flip" roll
	 * @param req - the request
	 * @param res - the response
	 */
	static async coin(req: RodRequest, res: RodResponse): Promise<void> {

		const flip = Math.random() > 0.5 ? 'heads' : 'tails';
		const title = req.parts.join(' ').replace(/^#/, '').trim();

		res.embedContent = flip + (title ? ' **`' + title + '`**' : '');
	}
}

export default RollHandler;