import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import _ from 'lodash';
import request from 'superagent';
import MersenneTwister from 'mersenne-twister';
import CSVParse from 'csv-parse';
const mt = new MersenneTwister();

/**
 * Commands for use with tables. Tables are uploaded as CSVs, with the first column being the "weight"
 * of the value, and the second column being the value itself.
 */
class TableHandler extends MultiCommandHandler {
	
	static multiCommands = new Map([
		['list', ['listtables']],
		['add', ['addtable', 'savetable', 'loadtable']],
		['remove', ['remtable', 'deletetable']],
		['roll', ['rolltable', 'tableroll']],
		['show', ['showtable', 'tableshow']]
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
	 * Adds a table from either an uploaded or linked CSV
	 * @example `/addtable wildmagic http://link.com/sheet.csv`
	 * @param req
	 * @param res
	 */
	static async add(req: RodRequest, res: RodResponse): Promise<void> {

		let name = req.parts[0];
		let url = req.parts[1];

		if (req.message.attachments.size) {
			const attachment = req.message.attachments.first();
			url = attachment.url;
			//console.log('- attachment found:', url);
		}

		// get the csv file
		try {
			const csvFile = await request.get(url).buffer();
			const parser = CSVParse( csvFile.body );
			const data = [];
			for await ( const record of parser ) {
				data.push( record );
			}
			console.log('- csv data:', url, data);
			data.shift(); // remove header row
			const tdata = data.map((row) => { return {text: row[1], weight: parseInt( row[0] )};});

			const table = {
				name: name,
				source: url,
				author: req.user.id,
				data: tdata
			};

			// save the table to the server
			req.server.tables = req.server.tables.filter((t) => { return t.name != name; });
			req.server.tables.push( table );
			await req.server.save();

			return res.send('Saved **' + name + '** with ' + table.data.length + ' rows!');

		} catch(e) {
			console.log('- csv error:', url, e);
			return res.sendSimple('There was an error loading or parsing your CSV file.');
		}
	}

	/**
	 * Deletes a table from the server
	 * @example `/remtable wildmagic`
	 * @param req
	 * @param res
	 */
	static async remove(req: RodRequest, res: RodResponse): Promise<void> {
		const name = req.parts[0];

		console.log('- removing table:', name );

		if (!req.server.tables.length) return res.sendSimple('You do not have any saved tables.');

		// find the table
		const table = _.find(req.server.tables, function (t) { return t.name.toLowerCase() == name.toLowerCase(); });
		if (!table) return await res.sendSimple('No such table: `' + name + '`');

		req.server.tables = req.server.tables.filter((t) => { return t.name != name; });
		await req.server.save();

		return res.send('Removed **' + name + '** with ' + table.data.length + ' rows.');
	}

	/**
	 * Rolls a table
	 * @example `/rolltable wildmagic` or `/rolltable [3] wildmagic` or `rolltable wildmagic 23`
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
			res.embeds = embeds;
			//console.log('- sending', embeds.length, 'embeds');
			return;
		}

		let error = null;
		const name = req.parts.shift();
		let num = req.parts.shift();
		//console.log('- rolling from table', name, num);

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
		em.setColor( RodResponse.ColorFromString( item.text ) );

		res.embed = em;
	}


}

export default TableHandler;
