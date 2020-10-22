import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Alias from '../lib/alias';
import _ from 'lodash';


class ManageAlias extends Handler {
	static addCommands = ['addalias', 'addnpc', 'add'];
	static editCommands = ['editalias', 'editnpc', 'edit'];
	static removeCommands = ['removealias', 'remnpc', 'rem', 'remove'];
	static removeAllCommands = ['remallnpc', 'removeallaliases'];

	//static commands = ManageAlias.addCommands.concat( ManageAlias.editCommands ).concat( ManageAlias.removeCommands );
	static commands = _.union(
		ManageAlias.addCommands,
		ManageAlias.editCommands,
		ManageAlias.removeCommands,
		ManageAlias.removeAllCommands
	);

	static async process(req: RodRequest, res: RodResponse): Promise<void> {
		const self = this;

		// which command type did we get?
		if (ManageAlias.addCommands.includes( req.command )) return self.add(req, res);
		if (ManageAlias.editCommands.includes( req.command )) return self.edit(req, res);
		if (ManageAlias.removeCommands.includes( req.command )) return self.remove(req, res);
		if (ManageAlias.removeAllCommands.includes( req.command )) return self.removeAll(req, res);
	}


	/**
	 * Adds an alias to the server
	 * @param req - the request
	 * @param res - the response
	 */
	static async add(req: RodRequest, res: RodResponse): Promise<void> {

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to add an alias.');

		if (!req.parts[0]) return await res.sendSimple('Your npc needs at least and id and a name.', '`/addalias id "My Name" http://images.com/myavatar.jpg`');

		const npc = {
			id: req.parts[0].toLowerCase(),
			name: req.parts[1],
			avatar: req.parts[2] || null,
			createdBy: req.message.author.id
		};

		// data checks
		if (!npc.id || !npc.name) return await res.sendSimple('Your npc needs at least and id and a name.', '`/addalias id "My Name" http://images.com/myavatar.jpg`');
		if (npc.id.length < 3 || npc.id.length > 32) return await res.sendSimple('Invalid Name', 'Your npc\'s id cannot be less than 3 characters or more than 32.');
		if (npc.name.length < 3 || npc.name.length > 32) return await res.sendSimple('Invalid Name', 'Your npc\'s name cannot be less than 3 characters or more than 32.');
		if (npc.avatar && !npc.avatar.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/)) {
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

	static async edit(req: RodRequest, res: RodResponse): Promise<void> {
		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to edit aliases.');

		// check data
		if (!req.parts[0]) return await res.sendSimple('You must include the id of the alias you wish to edit.', '`' + req.server.esc + 'editalias id NewName https://imagedomain.com/newimage.jpg`');

		// get the alias
		const alias = Alias.FindAlias(req, req.parts[0]);
		if (!alias) return await res.sendSimple('No such alias: `' + req.parts[0] + '`', 'Check your list: `' + req.server.esc + 'listaliases`');

		// if we're a channel admin, let's make sure we have access to it
		if (!alias.checkEdit(req)) return await res.sendSimple('As a channel admin, you can only edit aliases that you created.');

		// if we dont' have extra data, let's show them current data and let them know how to finish the edit
		if (req.parts.length == 1) {
			return await res.sendSimple('You need to supply new info to edit the alias: `' + req.server.esc + 'editalias id NewName https://imagedomain.com/newimage.jpg`', '```id: ' + alias.id + '\nname: ' + alias.name + '\nimage: ' + (alias.avatar || 'none') + '```');
		}

		// we're good, let's edit it
		if (req.parts[1]) alias.name = req.parts[1];
		if (req.parts[2]) alias.avatar = req.parts[2];
		await alias.save( req );

		// let's say something as our new alias
		res.alias = alias;
		await res.send('I am new an improved!');
	}

	static async remove(req: RodRequest, res: RodResponse): Promise<void> {
		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to edit aliases.');

		// check data
		if (!req.parts[0]) return await res.sendSimple('You must include the id of the alias you wish to edit.', '`' + req.server.esc + 'editalias id NewName https://imagedomain.com/newimage.jpg`');

		// get the alias
		const alias = Alias.FindAlias(req, req.parts[0]);
		if (!alias) return await res.sendSimple('No such alias: `' + req.parts[0] + '`', 'Check your list: `' + req.server.esc + 'listaliases`');

		// if we're a channel admin, let's make sure we have access to it
		if (!alias.checkEdit(req)) return await res.sendSimple('As a channel admin, you can only edit aliases that you created.');

		await alias.remove( req );
		await res.send('Alias `' + alias.name + '` has been deleted.');
	}

	static async removeAll(req: RodRequest, res: RodResponse): Promise<void> {
		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// do we have permission?
		const perm = req.getPermissions();
		if (perm !== 'admin') return await res.sendSimple('You do not have permission to edit aliases.');

		req.server.npcs = [];
		req.server.markModified( 'npcs' );
		await req.server.save();

		await res.send('Removed all aliases. I hope you meant to do that.');
	}

}

export default ManageAlias;