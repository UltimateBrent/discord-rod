import RodRequest from "./rodRequest";
import _ from 'lodash';

/**
 * An alias, formorly known as "npcs", is a persona that users can speak through using webhooks.
 */
class Alias {
	public id: string;
	public name: string;
	public avatar: string;
	public createdBy: string;
	public grant: string[];
	public grantRoles: string[];

	/**
	 * Creates an Alias given an "npc" entry from the server object.
	 * @param npc - basic object containing alias values
	 * @return the alias
	 */
	constructor(npc: any) {
		const self = this;

		self.id = npc.id;
		self.name = npc.name;
		self.avatar = npc.avatar;
		self.createdBy = npc.createdBy;
		self.grant = npc.grant || [];
		self.grantRoles = npc.grantRoles || [];
	}

	/**
	 * Removes the alias from the server data
	 * @param req - the request to get the server from
	 */
	public async remove( req: RodRequest ): Promise<void> {
		const self = this;

		
		if (!req.server.npcs) return; // paranoia

		// remove this one if it's there
		_.remove(req.server.npcs, function (n) { return n.id == self.id; });

		// save
		req.server.markModified('npcs');
		await req.server.save();
		return;
	}

	/**
	 * Saves this alias into the server data from the request
	 * @param req - the request to get the server from
	 */
	public async save( req: RodRequest ): Promise<void> {
		const self = this;

		// get the object data out
		const npc = {
			id: self.id,
			name: self.name,
			avatar: self.avatar,
			createdBy: self.createdBy,
			grant: self.grant,
			grantRoles: self.grantRoles
		};

		if (!req.server.npcs) req.server.npcs = [];

		// remove this one if it's there
		const old: any = _.find( req.server.npcs, function(n) { return n.id == self.id; });
		if (old) old.remove(); // mongoose subdocs get finicky if you replace with similar contents so we can't just remove from array
		req.server.markModified('npcs');

		// now add it
		req.server.npcs.push( npc );
		req.server.markModified('npcs');
		req.server = await req.server.save();
		return;
	}

	/**
	 * checks whether the current user can edit the alias, which is slightly different han being able to use it
	 * @param req - the request to use as context
	 * @return whether they can edit or not
	 */
	public checkEdit( req: RodRequest ): boolean {
		const self = this;

		// check permissions
		const perm = req.getPermissions();

		// what are we checking against?
		const checkId = req.message.author.id;

		// are we admins?
		if (perm == 'admin' || (perm == 'channeladmin' && self.createdBy == checkId)) {
			return true;
		}

		return false;
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
		if (!userId && !roleId && (perm == 'admin' || (perm == 'channeladmin' && self.createdBy == checkId))) {
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

		if (self.grantRoles && !userId && !roleId) {
			const r = _.find(self.grantRoles, function (r) {
				return req.guser.roles.cache.has(r);
			});
			if (r) {
				return true;
			}
		}

		// not conditions met
		return false;
	}

	/**
	 * Searches the saved npcs for a particular npc id
	 * @param id - the NPC's id
	 * @return the found alias
	 */
	public static FindAlias( req: RodRequest, id: string ): Alias {
		if (req.server.npcs) {
			const npcData = _.find( req.server.npcs, function(n) {
				return n.id.toLowerCase() == id.toLowerCase();
			});

			if (npcData) return new Alias( npcData );
		}

		return null;
	}
}

export default Alias;