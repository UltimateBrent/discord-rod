import mongoose, { Schema, Document, Model } from 'mongoose';
import Discord, { Message } from 'discord.js';
import _ from 'lodash';

export interface IUser extends Document {
	_id: String,
	name: String,
	serverSettings: any,
	settings: { // overwritten by server settings on load, these are defaults only
		macros?: [{
			name: String,
			roll: String
		}],
		autoAlias?: String // npc.id
	},
	empty: boolean
}

export interface IUserModel extends Model<IUser> {

	/**
	 * Looks up a user based on their discord id and sets their settings
	 * @param u - the discord user object from the message
	 * @param gid - the guild id
	 * @return the rod user object
	 */
	GetFromID(u: Discord.User, gid: string): Promise<any>;

	/**
	 * Saves a user setting
	 * @param u - the discord user object
	 * @param gid - the guild id
	 * @param key - the setting key
	 * @param value - the setting value
	 * @return the resulting rod user
	 */
	SaveSetting(u: Discord.User, gid: string, key: string, value: any): Promise<IUser>;
}

const s = new Schema({
	_id: String,
	name: String,
	serverSettings: Schema.Types.Mixed,
	settings: { // overwritten by server settings on load, these are defaults only
		macros: [{
			name: String,
			roll: String
		}],
		autoAlias: { type: String, default: false } // npc.id
	}
});

s.statics.GetFromID = async function (u: Discord.User, gid: string): Promise<IUser|any> {

	/*if (rod.userCache[ u.id ] && !rod.userCache[ u.id ].dirty) {
		var s = rod.userCache[ u.id ];
		if (s.serverSettings && s.serverSettings[gid]) s.settings = _.extend(s.settings, s.serverSettings[gid]);
		return cb(null, rod.userCache[ u.id ]);
	}*/

	let s: any = await this.findOne({ _id: u.id });
	if (s) {
		//rod.userCache[ u.id ] = s;
		if (s.serverSettings && s.serverSettings[gid]) s.settings = _.extend(s.settings, s.serverSettings[gid]);
		return s;
	}

	s = { empty: true, _id: u.id, settings: {} };

	return s;
};

s.statics.SaveSetting = async function (u: Discord.User, gid: string, key: string, value: any): Promise<IUser> {
	let gu: IUser = await this.GetFromID(u, gid);

	// do we have a real user?
	if (!gu || gu.empty) {
		gu = new User();
		gu._id = u.id;
		gu.name = u.username;
		gu.serverSettings = {};
	}

	if (!gu.serverSettings[gid]) gu.serverSettings[gid] = {};

	gu.serverSettings[gid][key] = value;
	gu.settings = {};
	gu.markModified('serverSettings');
	gu.markModified('settings');
	gu = await gu.save();
	
	// let's apply server settings over defaults
	if (gu.serverSettings && gu.serverSettings[gid]) gu.settings = _.extend(gu.settings, gu.serverSettings[gid]);

	return gu;
};

const User = mongoose.model<IUser, IUserModel>('User', s);
export default User;

