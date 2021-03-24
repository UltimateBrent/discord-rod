import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';

/**
 * Multi-command class handling all alias creation and management
 */
class HelpHandler extends MultiCommandHandler {
	
	static multiCommands = new Map([
		['help', ['help']]
	]);

	/**
	 * Prints out basic help info
	 * @param req - the request
	 * @param res - the response
	 */
	static async help(req: RodRequest, res: RodResponse): Promise<void> {

		res.sendSimple('Stuck on something? Check out the reference at <https://rodbot.io/reference> or hit up our discord: https://discord.gg/MvdRurG');
	}

}

export default HelpHandler;