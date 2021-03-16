import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';


class Middleware {

	static commands: string[];
	/** @var sets the priority of the middleware execution. Bigger executes first */
	static priority: number = 10;

	static async process(req: RodRequest, res: RodResponse): Promise<void> { }

}

export default Middleware;