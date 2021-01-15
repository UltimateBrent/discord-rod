import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import _ from 'lodash';

/**
 * Commands for use with tables. Tables are uploaded as CSVs, with the first column being the "weight"
 * of the value, and the second column being the value itself.
 */
class TableHandler extends MultiCommandHandler {
	
	static multiCommands = new Map([
		['list', ['listtables']],
		['add', ['addtable', 'savetable']],
		['remove', ['remmtable', 'deletetable', 'remroll']],
		['roll', ['rolltable', 'tableroll']]
	]);

	/**
	 * Lists the tables on this server
	 * @example `/listtables`
	 * @param req
	 * @param res
	 */
	static async list(req: RodRequest, res: RodResponse): Promise<void> {

		const ts = req.server.tables || [];
		if (!ts.length) return res.sendSimple('You have no saved tables.');

		const texts = _.map(req.server.tables, function(t) {
			return '`' + t.name.toLowerCase() + '`: ' + t.data.length + ' rows';
		});

		return await res.sendSimple('', '```css\n## Tables ##\n```\n' + texts.join('\n'), { deleteCommand: true });
	}

}

export default TableHandler;
