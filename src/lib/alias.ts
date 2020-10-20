import RodRequest from "./rodRequest";
import Discord from 'discord.js';
import _ from 'lodash';

class Alias {
	public id: string;
	public name: string;
	public avatar: string;
	public createdBy: string;
	public grant: string[];
	public grantRoles: string[];

	constructor(data: any) {
		const self = this;

		for (const key in data) {
			if (self.hasOwnProperty( key )) self[key] = data[key];
		}
	}

	/**
	 * checks whether the current alias is usable by the author of the request
	 * @param req - the request to use as context
	 * @param userId - (optional) override to check this user instead of the author
	 * @param roleId - (optional) override to check this role instead of the author's
	 * @return whether or not they should be allowed
	 */
	public checkGrant( req: RodRequest, userId: string = null, roleId: string = null ): boolean {
		const self = this;

		// check permissions
		const perm = req.getPermissions();

		// what are we checking against?
		const checkId = userId || req.message.author.id;

		// are we admins?
		if (perm == 'admin' || (perm == 'channeladmin' && self.createdBy == checkId)) {
			return true;
		}

		// are we regular grants?
		if (self.grant && self.grant.indexOf( checkId ) !== -1) {
			return true;
		}

		// are we a role grant?
		if (self.grantRoles && roleId && self.grantRoles.indexOf( roleId ) !== -1) {
			return true;
		}

		if (self.grantRoles && !roleId) {
			const r = _.find(self.grantRoles, function (r) {
				return _.find(req.guser.roles.cache.array(), function (ur) {
					return ur.id == r;
				});
			});
			if (r) {
				return true;
			}
		}

		// not conditions met
		return false;
	}
}

export default Alias;