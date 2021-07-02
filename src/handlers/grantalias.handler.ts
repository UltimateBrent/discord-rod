import Discord from 'discord.js';
import RodRequest from '../lib/rodRequest';
import RodResponse from '../lib/rodResponse';
import MultiCommandHandler from './multi.handler';
import Alias from '../lib/alias';
import _ from 'lodash';
import User from '../models/user.model';


class GrantAlias extends MultiCommandHandler {

	static multiCommands = new Map([
		['grant', ['grant', 'grantnpc', 'grantalias']],
		['remgrant', ['remgrant', 'remgrantnpc', 'remgrantalias']]
	]);
	
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
		if (!req.parts[0] || !(req.message.mentions.users.size || req.message.mentions.roles.size)) return await res.sendSimple('You must include the id of the alias you wish to grant and mention a person or role to grant it to.', '`' + req.esc + 'grantalias id @name`');

		// get the alias
		const alias = Alias.FindAlias(req, req.parts[0]);
		if (!alias) return await res.sendSimple('No such alias: `' + req.parts[0] + '`', 'Check your list: `' + req.esc + 'listaliases`');

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

		
		res.alias = alias;

		return res.send('I am now able to be used by ' + mentionText + '! Usage: `' + req.esc + 'use ' + alias.id + ' whatever you want to say`. You can also `' + req.esc + 'roll` and inline roll in those messages. Use `' + req.esc + 'setalias ' + alias.id + '` or `' + req.esc + 'setchannelalias ' + alias.id + '` to always have anything you say converted to me. You can use `' + req.esc + 'setalias off` to turn that off, and `' + req.esc + 'alias` to see your current alias settings.');
	}

	/**
	 * Removes access to an alias from a set of given users/roles
	 * @param req
	 * @param res
	 */
	static async remgrant(req: RodRequest, res: RodResponse): Promise<void> {
		// do we have permission?
		const perm = req.getPermissions();
		if (!perm) return await res.sendSimple('You do not have permission to grant aliases.');

		// check data
		if (!req.parts[0] || !(req.message.mentions.users.size || req.message.mentions.roles.size)) return await res.sendSimple('You must include the id of the alias you wish to ungrant and mention a person or role to remove the grant from.', '`' + req.esc + 'remgrantalias id @name`');

		// get the alias
		const alias = Alias.FindAlias(req, req.parts[0]);
		if (!alias) return await res.sendSimple('No such alias: `' + req.parts[0] + '`', 'Check your list: `' + req.esc + 'listaliases` then try again: `' + req.esc + 'remgrantalias id @name`');

		// if we're a channel admin, let's make sure we have access to it
		if (!alias.checkEdit(req)) return await res.sendSimple('As a channel admin, you can only edit aliases that you created.');

		const users = req.message.mentions.users.size ? _.map(req.message.mentions.users.array(), function (m) { return m.id; }) : [];
		const roles = req.message.mentions.roles.size ? _.map(req.message.mentions.roles.array(), function (m) { return m.id; }) : [];

		alias.grant = _.without(alias.grant, ...users);
		alias.grantRoles = _.without(alias.grantRoles, ...roles);

		await alias.save( req );

		let granted = [];
		if (users) granted = granted.concat(_.map(users, function (m) { return '<@' + m + '>'; }));
		if (roles) granted = granted.concat(_.map(roles, function (m) { return '<@&' + m + '>'; }));
		const mentionText = granted.join(', ');

		res.alias = alias;

		return res.send('I am now free of ' + mentionText + '! Please remind them to check their aliases with `' + req.esc + 'alias` to make sure they aren\'t set to use this anymore.');
	}

	
}

export default GrantAlias;
