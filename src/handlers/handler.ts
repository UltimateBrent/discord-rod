import RodRequest from "../lib/rodRequest";


abstract class Handler {

	abstract process( req: RodRequest ): void;

}

export default Handler;