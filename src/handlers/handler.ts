import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';


class Handler {

	static commands: string[];

	static async process( req: RodRequest, res: RodResponse ): Promise<void> {}

}

export default Handler;