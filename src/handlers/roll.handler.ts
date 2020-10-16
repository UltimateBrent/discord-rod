import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Roll from '../lib/roll';


class RollHandler extends Handler {

	static commands: string[] = ['roll', 'r'];

	static process( req: RodRequest, res: RodResponse ): void {
		const roll: Roll = Roll.parseRoll( req, req.params.join(' ') );
		console.log('- process roll:', roll);
	}

	static test() {
		console.log('- static test on roll handler worked');
	}
}

export default RollHandler;