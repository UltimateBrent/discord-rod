import mongoose, { Schema, Document, Model } from 'mongoose';
import Discord, { Message } from 'discord.js';
import _ from 'lodash';
import RodRequest from '../lib/rodRequest';
import Alias from '../lib/alias';

export interface IUser extends Document {
	_id: string,
	name: string,
	serverSettings: any,
	settings: { // overwritten by server-specific settings on load, these are defaults only
		macros?: [{
			name: string,
			roll?: string
		}],
		autoAlias?: string, // npc.id
		channelAliases?: any
	},
	empty: boolean,
	saveSetting(req: RodRequest, key: string, val: any): Promise<IUser>,
	getCurrentAlias(req: RodRequest): Alias
}

export interface IUserModel extends Model<IUser> {

	/**
	 * Looks up a user based on their discord id and sets their settings
	 * @param u - the discord user object from the message
	 * @param gid - the guild id
	 * @return the rod user object
	 */
	GetFromID(u: Discord.User, gid: string): Promise<IUser>;

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

	s = new User({ _id: u.id, name: u.username, settings: {}, serverSettings: {} });

	return s;
};

/**
 * Saves a setting for the user, using the current guild as context
 * @param req - the request to get the guild
 * @param key - setting name
 * @param val - setting value
 * @return resulting user object
 */
s.methods.saveSetting = async function (req: RodRequest, key: string, val: any): Promise<IUser> {
	
	const gu = this;
	const gid = req.channel.guild.id;

	if (!gu.serverSettings[gid]) gu.serverSettings[gid] = {};

	gu.serverSettings[gid][key] = val;
	gu.settings = {};
	gu.markModified('serverSettings');
	gu.markModified('settings');
	await gu.save();
	
	// let's apply server settings over defaults
	if (gu.serverSettings && gu.serverSettings[gid]) gu.settings = _.extend(gu.settings, gu.serverSettings[gid]);

	return gu;
};

/**
 * Calculates current alias that would be used in this channel
 */
s.methods.getCurrentAlias = function(req: RodRequest): Alias {

	// get server-level alias
	const sKey = this.settings?.autoAlias;

	// get channel alias
	const channelAliases: any = this.settings?.channelAliases || {};
	const caKey = channelAliases[ req.message.channel.id ];

	// if channel alias is set to none, we don't want any alias at all
	if (caKey == 'none') return null;

	// if we have a channel alias, let's return that
	if (caKey && caKey != 'auto') return Alias.FindAlias(req, caKey);

	// if we have a server alias, return that
	if (sKey) return Alias.FindAlias(req, sKey);

	return null;
}

const User = mongoose.model<IUser, IUserModel>('User', s);
export default User;

