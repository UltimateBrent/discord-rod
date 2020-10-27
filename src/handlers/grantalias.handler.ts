import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import Handler from './handler';
import Alias from '../lib/alias';
import _ from 'lodash';
import User from '../models/user.model';


class GrantAlias extends Handler {
	static grantCommands = ['grant', 'grantnpc', 'grantalias'];
	static remCommands = ['remgrant', 'remgrantnpc', 'remgrantalias'];

	static commands = _.union(
		GrantAlias.grantCommands,
		GrantAlias.remCommands
	);

	static async process(req: RodRequest, res: RodResponse): Promise<void> {
		const self = this;

		// are we in a DM?
		if (!req.channel.guild) return await res.sendSimple('This command does not work in direct messages.');

		// which command type did we get?
		if (GrantAlias.grantCommands.includes(req.command)) return self.grant(req, res);
		if (GrantAlias.remCommands.includes(req.command)) return self.remgrant(req, res);
		
		
	}

	/**
	 * Grants access to an alias to set of users/roles
	 * @param req
	 * @param res
	 */
	static async grant(req: RodRequest, res: RodResponse): Promise<void> {

		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to grant aliases.');

		// check data
		if (!req.parts[0] || !(req.message.mentions.users.size || req.message.mentions.roles.size)) return await res.sendSimple('You must include the id of the alias you wish to grant and mention a person or role to grant it to.', '`' + req.server.esc + 'grantalias id @name`');

		// get the alias
		const alias = Alias.FindAlias(req, req.parts[0]);
		if (!alias) return await res.sendSimple('No such alias: `' + req.parts[0] + '`', 'Check your list: `' + req.server.esc + 'listaliases`');

		// if we're a channel admin, let's make sure we have access to it
		if (!alias.checkEdit(req)) return await res.sendSimple('As a channel admin, you can only edit aliases that you created.');

		const users = req.message.mentions.users.size ? _.map(req.message.mentions.users.array(), function (m) { return m.id; }) : [];
		const roles = req.message.mentions.roles.size ? _.map(req.message.mentions.roles.array(), function (m) { return m.id; }) : [];

		alias.grant = _.uniq( alias.grant.concat( users ) );
		alias.grantRoles = _.uniq( alias.grantRoles.concat( roles ) );

		await alias.save( req );

		let granted = [];
		if (users) granted = granted.concat(_.map(users, function (m) { return '<@' + m + '>'; }));
		if (roles) granted = granted.concat(_.map(roles, function (m) { return '<@&' + m + '>'; }));
		const mentionText = granted.join(', ');

		res.content = 'I an now able to be used by ' + mentionText + '! Usage: `' + req.server.esc + 'use ' + alias.id + ' whatever you want to say`. You can also `' + req.server.esc + 'roll` and inline roll in those messages. Use `' + req.server.esc + 'setalias ' + alias.id + '` or `' + req.server.esc + 'setchannelalias ' + alias.id + '` to always have anything you say converted to me. You can use `' + req.server.esc + 'setalias off` to turn that off, and `' + req.server.esc + 'alias` to see your current alias settings.';
		res.alias = alias;

		return;
	}

	/**
	 * Removes access to an alias from a set of given users/roles
	 * @param req
	 * @param res
	 */
	static async remgrant(req: RodRequest, res: RodResponse): Promise<void> {
		
	}

	
}

export default GrantAlias;
