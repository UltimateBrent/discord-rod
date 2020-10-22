import Alias from '../lib/alias';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Middleware from '../middleware/middleware';

/**
 * Run on every message, and applies an Alias if necesary.
 */
class AliasMiddleware extends Middleware {

	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// get current alias, if any
		const alias: Alias = req.user.getCurrentAlias( req );
		console.log('- current alias found as:', alias);
		if (alias) {
			res.alias = alias;
			res.shouldSend = true;
			if (!req.command) res.content = req.message.content;
		}
	}

}

export default AliasMiddleware;