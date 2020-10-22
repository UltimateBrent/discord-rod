import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';


class Middleware {

	static commands: string[];

	static async process(req: RodRequest, res: RodResponse): Promise<void> { };

}

export default Middleware;