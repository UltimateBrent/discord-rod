import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import Alias from '../lib/alias';
import _ from 'lodash';

/**
 * Multi-command class handling all alias creation and management
 */
class ManageAlias extends MultiCommandHandler {
	
	static multiCommands = new Map([
		['add', ['addalias', 'addnpc', 'add']],
		['edit', ['editalias', 'editnpc']],
		['remove', ['removealias', 'remalias', 'remnpc', 'rem', 'remove']],
		['removeAll', ['remallnpc', 'removeallaliases', 'remallalias']],
		['editspeech', ['edit', 'editspeech']],
		['deletespeech', ['delete', 'deletespeech']]
	]);

	/**
	 * Adds an alias to the server
	 * @param req - the request
	 * @param res - the response
	 */
	static async add(req: RodRequest, res: RodResponse): Promise<void> {

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to add an alias.');

		if (!req.parts[0]) return await res.sendSimple('Your alias needs at least and id and a name.', '`/addalias id "My Name" http://images.com/myavatar.jpg`');

		// did they uploaded an image instead of putting it in the message?
		if (!req.parts[2] && req.message.attachments.size) {
			const attachment = req.message.attachments.first();
			req.parts[2] = attachment.url;
		}

		const npc = {
			id: req.parts[0].toLowerCase(),
			name: req.parts[1],
			avatar: req.parts[2] || null,
			createdBy: req.message.author.id
		};

		// data checks
		if (!npc.id || !npc.name) return await res.sendSimple('Your alias needs at least and id and a name.', '`/addalias id "My Name" http://images.com/myavatar.jpg`');
		if (npc.id == 'false') return await res.sendSimple('Invalid Name', 'Your alias\'s id cannot be `false` because of an old Rod1 bug. Sorry.');
		if (npc.id.length < 3 || npc.id.length > 32) return await res.sendSimple('Invalid Name', 'Your alias\'s id cannot be less than 3 characters or more than 32.');
		if (npc.name.length < 3 || npc.name.length > 32) return await res.sendSimple('Invalid Name', 'Your alias\'s name cannot be less than 3 characters or more than 32.');
		if (npc.avatar && !npc.avatar.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/)) {
			return await res.sendSimple('The avatar you supplied  `' + npc.avatar + '` does not seem to be a valid URL.', '`/addalias id "My Name" https://images.com/myavatar.jpg`');
		}

		const existing = Alias.FindAlias( req, npc.id );
		if (existing) {
			console.log('- found alias:', existing );
			return await res.sendSimple( 'There is already an alias with this id.' );
		}

		const hooks = await req.getWebhooks( true );
		if (!hooks.size) {
			return await res.sendSimple( 'Your alias data is okay, but this channel does not have webhooks and Rod could not create them. Please make sure Rod has permissions to manage webhooks and try again.' );
		}

		// let's create it and save it
		const alias = new Alias( npc );
		await alias.save( req );

		//let's say something as the new alias
		res.alias = alias;
		res.send('I am alive!');
	}

	/**
	 * Edits an alias
	 * @param req
	 * @param res
	 */
	static async edit(req: RodRequest, res: RodResponse): Promise<void> {
		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to edit aliases.');

		// check data
		if (!req.parts[0]) return await res.sendSimple('You must include the id of the alias you wish to edit.', '`' + req.esc + 'editalias id NewName https://imagedomain.com/newimage.jpg`');

		// get the alias
		const alias = Alias.FindAlias(req, req.parts[0]);
		if (!alias) return await res.sendSimple('No such alias: `' + req.parts[0] + '`', 'Check your list: `' + req.esc + 'listaliases`');

		// if we're a channel admin, let's make sure we have access to it
		if (!alias.checkEdit(req)) return await res.sendSimple('As a channel admin, you can only edit aliases that you created.');

		// if we dont' have extra data, let's show them current data and let them know how to finish the edit
		if (req.parts.length == 1) {
			return await res.sendSimple('You need to supply new info to edit the alias: `' + req.esc + 'editalias id NewName https://imagedomain.com/newimage.jpg`', '```id: ' + alias.id + '\nname: ' + alias.name + '\nimage: ' + (alias.avatar || 'none') + '```');
		}

		// if there was an uploaded image, but nothing sent in otherwise, let's use that
		if (!req.parts[2] && req.message.attachments.size) {
			const attachment = req.message.attachments.first();
			req.parts[2] = attachment.url;
		}

		// we're good, let's edit it
		if (req.parts[1]) alias.name = req.parts[1];
		if (req.parts[2]) alias.avatar = req.parts[2];
		await alias.save( req );

		// let's say something as our new alias
		res.alias = alias;
		await res.send('I am new and improved!');
	}

	/**
	 * Removes an alias from the server
	 * @param req
	 * @param res
	 */
	static async remove(req: RodRequest, res: RodResponse): Promise<void> {
		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to edit aliases.');

		// check data
		if (!req.parts[0]) return await res.sendSimple('You must include the id of the alias you wish to edit.', '`' + req.esc + 'editalias id NewName https://imagedomain.com/newimage.jpg`');

		// get the alias
		const alias = Alias.FindAlias(req, req.parts[0]);
		if (!alias) return await res.sendSimple('No such alias: `' + req.parts[0] + '`', 'Check your list: `' + req.esc + 'listaliases`');

		// if we're a channel admin, let's make sure we have access to it
		if (!alias.checkEdit(req)) return await res.sendSimple('As a channel admin, you can only edit aliases that you created.');

		await alias.remove( req );
		await res.send('Alias `' + alias.name + '` has been deleted.');
	}

	/**
	 * Removes all aliases on the server. (Admin only)
	 * @param req
	 * @param res
	 */
	static async removeAll(req: RodRequest, res: RodResponse): Promise<void> {

		// do we have permission?
		const perm = req.getPermissions();
		if (perm !== 'admin') return await res.sendSimple('You do not have permission to edit aliases.');

		req.server.npcs = [];
		req.server.markModified( 'npcs' );
		await req.server.save();

		await res.send('Removed all aliases. I hope you meant to do that.');
	}

	/**
	 * Edits the last thing the user said, as long as it was the last thing in the channel by deleting and reposting
	 * @param req
	 * @param res
	 */
	static async editspeech(req: RodRequest, res: RodResponse): Promise<void> {
		if (!req.parts[0]) return await res.sendSimple('Editing requires that you provide a new message.', '`' + req.esc + 'editspeech My new message`');

		// get last message posted
		const ms = await req.channel.messages.fetch({before: req.message.id, limit: 1});
		const lastMessage = ms.first();

		const lastGhost = req.server.lastMessages[ req.channel.id ];

		if (!lastMessage.content || !lastGhost.content) return await res.sendSimple('The last message was not editable.', null, { deleteCommand: true, deleteMessage: true });

		if (lastMessage.author.bot && lastMessage.content.trim() == lastGhost.content.trim() && req.message.author.id == lastGhost.author) {
			// we have permission to edit, so let's do it
			if (lastMessage.embeds.length) {
				const em = lastMessage.embeds.shift();
				res.embed = em;
			}
			res.postAs = {
				name: lastGhost.name,
				avatar: lastGhost.avatar
			};

			lastMessage.delete();

			return await res.send( req.message.content.replace(/^\S+ /, ''));
		} else {
			return await res.sendSimple('You were not the author of the last aliased message, so we cannot edit it.', null, { deleteCommand: true, deleteMessage: true });
		}
	}

	/**
	 * Deletes the last thing the user said, as long as it was the last thing in the channel
	 * @param req
	 * @param res
	 */
	static async deletespeech(req: RodRequest, res: RodResponse): Promise<void> {
		// get last message posted
		const ms = await req.channel.messages.fetch({ before: req.message.id, limit: 1 });
		const lastMessage = ms.first();

		const lastGhost = req.server.lastMessages[req.channel.id];

		if (!lastMessage.content || !lastGhost.content) return await res.sendSimple('The last message isn\'t deletable.');

		if (lastMessage.author.bot && lastMessage.content.trim() == lastGhost.content.trim() && req.message.author.id == lastGhost.author) {
			// we have permission to edit, so let's do it
			lastMessage.delete();

			return await res.sendSimple('Message deleted', 'Self-destructing in 5s', {deleteCommand: true, deleteMessage: true});
		} else {
			return await res.sendSimple('You were not the author of the last aliased message, so we cannot edit it.', null, { deleteCommand: true, deleteMessage: true });
		}
	}

}

export default ManageAlias;