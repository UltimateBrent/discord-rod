import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import _ from 'lodash';
import MersenneTwister from 'mersenne-twister';
const mt = new MersenneTwister();

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

	/**
	 * Rolls a table
	 * @example `/rolltable wildmagic`
	 * @param req
	 * @param res
	 */
	static async roll(req: RodRequest, res: RodResponse): Promise<void> {
		const self = this;

		// does this have iterations?
		if (req.parts[0].match(/\[[0-9+)]\]/)) {
			let iterations = parseInt( req.parts.shift().replace(/[\[\]]/g, '') );
			const name = req.parts.shift();
			let embeds = [];
			let n = 0;
			while (iterations) {
				n++;
				req.parts = [name];
				await self.roll(req, res);
				res.embed.setFooter('Table roll #' + n);
				embeds.push( new Discord.MessageEmbed(res.embed) );
				iterations--;
			}
			res.embed = null;
			console.log('- sending', embeds.length, 'embeds');
			return await res.sendSimple(null, embeds); //TODO: This seems to work right, but they dont' all show up
		}

		let error = null;
		const name = req.parts.shift();
		let num = req.parts.shift();
		console.log('- rolling from table', name, num);

		const table = _.find( req.server.tables, function(t) { return t.name.toLowerCase() == name.toLowerCase(); });
		if (!table) return await res.sendSimple('No such table: `' + name + '`');

		// expanded out the weight to make rolling easier
		const expanded = [];
		for (const r of table.data) {
			let w = r.weight || 1;
			while (w > 0) {
				expanded.push(r);
				w--;
			}
		}

		const weight = expanded.length;

		if (num) {
			let n = parseInt( num );
			if (n <= 0) {
				error = '(*Supplied number was less than one. Randomizing.*)';
				num = null;
			} else
			if (n > weight) {
				error = '(*Supplied number was greater than max value. Randomizing.*)';
				num = null;
			}
		}

		const roll = num ? parseInt( num ) - 1 : Math.floor( mt.random() * weight );
		const item = expanded[ roll ];

		const em = new Discord.MessageEmbed();
		em.setTitle( 'Rolling for ' + name.toUpperCase() );
		em.setDescription( 'Rolled a d' + weight + ' => `' + (roll + 1) + '` ' + (error || '') + '\n\n```\n' + item.text + '\n```');
		em.setColor('#00FF00');

		res.embed = em;
	}


}

export default TableHandler;
