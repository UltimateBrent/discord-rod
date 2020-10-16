import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';


abstract class Handler {

	abstract process( req: RodRequest, res: RodResponse ): void;

}

export default Handler;