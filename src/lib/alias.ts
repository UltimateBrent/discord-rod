import RodRequest from "./rodRequest";
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
	 * @return whether or not they should be allowed
	 */
	public checkGrant( req: RodRequest ): boolean {
		const self = this;

		// check permissions
		const perm = req.getPermissions();

		// are we admins?
		if (perm == 'admin' || (perm == 'channeladmin' && self.createdBy == req.message.author.id)) {
			return true;
		}

		// are we regular grants?
		if (self.grant && self.grant.indexOf(req.message.author.id) !== -1) {
			return true;
		}

		// are we a role grant?
		if (self.grantRoles) {
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