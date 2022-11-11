import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Alias from '../lib/alias';
import _ from 'lodash';


class UseOnceAlias extends Handler {
	static commands = ['useonce', 'sayonce'];

	/**
	 * Posts as an alias with the supplied info, for one-time use
	 * @param req - the request
	 * @param res - the response
	 */
	static async process(req: RodRequest, res: RodResponse): Promise<void> {

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		const name = req.parts[0];
		let image = req.parts[1];
		console.log('- parts:', req.parts);
		if (!image || !image.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/)) {
			// this wasn't an image
			image = null;
		}

		res.postAs = {
			name: name,
			avatar: image
		};

		// remove the name and image if applicable
		const reg = new RegExp('^\\S+ "?' + name +'"?');
		let newText = req.message.content.replace(reg, '');
		if (image) newText = newText.trim().replace(/^\S+ /, '');

		// recreate the message without the params
		return await res.send( newText );
	}

}

export default UseOnceAlias;