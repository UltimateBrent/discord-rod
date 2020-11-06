import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Roll from '../lib/roll';


class RollHandler extends Handler {

	static commands: string[] = ['roll', 'r'];

	static async process(req: RodRequest, res: RodResponse): Promise<void> {
		const roll: Roll = Roll.parseRoll( req, req.parts.join(' ') );
		console.log('- process roll:', roll);

		if (roll.errors.length) {
			res.errors = res.errors.concat( roll.errors );
		}
		res.roll = roll;
		res.embedContent = roll.text;
	}
}

export default RollHandler;