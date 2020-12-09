import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import _ from 'lodash';

/**
 * Expansion of the handler so that it can take multiple command entry points and assign them to correct functions for ease of grouping.
 * Assign the Map `multiCommands` with the function names as the keys, and array of commands as the values
 */
class MultiCommandHandler extends Handler {
	/** @property Sets the handler function for arrays of possible commands */
	static multiCommands: Map<string, string[]> = new Map();

	static allowInDMs: boolean = false;


	static get commands(): string[] {
		const self = this;

		let commands = [];
		for (let [f, subcommands] of self.multiCommands) {
			commands = commands.concat( subcommands );
		}

		return commands;
	}

	static async process(req: RodRequest, res: RodResponse): Promise<void> {
		const self = this;

		// are we in a DM?
		if (!req.channel.guild && !self.allowInDMs) return await res.sendSimple('This command does not work in direct messages.');

		// which command type did we get?
		for (let [f, subcommands] of self.multiCommands) {
			if (subcommands.includes( req.command )) return self[f](req, res);
		}
		
		console.log('- command sent to this handler, but unhandled:', req.command);		
		
	}

}

export default MultiCommandHandler;
