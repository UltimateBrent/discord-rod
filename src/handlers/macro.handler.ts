import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import _ from 'lodash';

/**
 * Commands for managing macros. This is a bigger departure from how Rod 1
 * handled saved rolls, we're going to make any command or sequence of
 * commands savable. To maintain compatibility with saved rolls, we'll
 * also keep the `user.settings.macros.roll` attribute, but manage all of
 * that from these functions.
 * 
 * @example `/addmacro`
 */
class MacroHandler extends MultiCommandHandler {
	
	static multiCommands = new Map([
		//['run', ['runmacro', 'run', 'exec', 'my']],
		['add', ['addroll', 'saveroll']],
		['list', ['listmacros', 'listrolls']],
		['remove', ['remmacro', 'deletemacro', 'remroll']]
	]);

	/**
	 * Adds a macro for the user
	 * @example `/addmacro axe /roll 2d12 + 5 # axe damage`
	 * @param req
	 * @param res
	 */
	static async add(req: RodRequest, res: RodResponse): Promise<void> {

		const name = req.parts.shift();
		const text = req.parts.join(' ');
		console.log('- add macro', name + ':', text);

		if (!name || !text) return await res.sendSimple('You must include a name for your macro and the command it will execute. Extra spaces in your command can also cause this.', '`' + req.esc + 'saveroll name command`');

		let current = (req.user.serverSettings ? req.user.serverSettings.macros : null) || req.user.settings.macros || [];
		const m = {
			name: name,
			roll: text
		};

		current = _.filter( current, function(r) { return r.name != m.name; });
		current.push(m);

		await req.user.saveSetting(req, 'macros', current);

		return await res.sendSimple('Macro `' + name + '` saved.', '`' + req.esc + 'roll ' + name + ' => ' + text + '`');
	}

	/**
	 * Lists the users current macros
	 * @example `/listrolls`
	 * @param req
	 * @param res
	 */
	static async list(req: RodRequest, res: RodResponse): Promise<void> {

		const ms = req.user.settings.macros || [];
		if (!ms.length) return await res.sendSimple('You have no saved rolls.');

		const texts = _.map( ms, function(m) {
			return '**' + m.name + '**: `' + m.roll + '`';
		});

		return await res.sendSimple('', '```css\n## Your Rolls ##\n```\n' + texts.join('\n'), {deleteCommand: true});
	}

	/**
	 * Removes a saved macro for the user
	 * @example `/remroll axe`
	 * @param req
	 * @param res
	 */
	static async remove(req: RodRequest, res: RodResponse): Promise<void> {

		const name = req.parts.shift();
		if (!name) return await res.sendSimple('You must include a name to remove a macro.', '`' + req.esc + 'remroll name`');

		let current = (req.user.serverSettings ? req.user.serverSettings.macros : null) || req.user.settings.macros || [];

		current = _.filter(current, function (r) { return r.name != name; });

		await req.user.saveSetting(req, 'macros', current);

		return await res.sendSimple('Macro `' + name + '` removed.');
	}

}

export default MacroHandler;
