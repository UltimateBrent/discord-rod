import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Roll from '../lib/roll';


class RollHandler extends Handler {

	static commands: string[] = ['roll', 'r'];

	static process( req: RodRequest, res: RodResponse ): void {
		const roll: Roll = Roll.parseRoll( req, req.params.join(' ') );
		console.log('- process roll:', roll);

		if (roll.errors.length) {
			res.errors = res.errors.concat( roll.errors );
		}
		res.embedContent = roll.text;
	}
}

export default RollHandler;