import mongoose, { Schema, Document, Model } from 'mongoose';
import Discord from 'discord.js';
import _ from 'lodash';

export interface IServer extends Document { // Typescript definition
	_id: string,
	name: string,
	owner: string,
	esc: string,
	members: [string],
	created: Date,
	settings: {
		botName: string,
		allowAlias: boolean,
		npcPermission: string,
		tagAliases: string
	},
	ignorePrefixes: [string],
	lastMessages: any,
	tables: [
		{
			name: string,
			source: string,
			author: string,
			data: any
		}
	],
	npcs: [{
		id: string,
		name: string,
		avatar: string,
		createdBy: string,
		grant: [string],
		grantRoles: [string],
		avraeId: string
	}],
	rollCalls: [
		{
			message: string,
			channel: string,
			name: string,
			text: string,
			start: Date,
			completed: boolean,
			mentions: [{
				id: string,
				name: string
			}],
			npcs: [string],
			rolls: [{
				key: string,
				name: string,
				text: string,
				roll: number,
				from: string,
				count: number
			}],
			logs: [string]
		}
	],
	dones: [
		{
			message: string,
			channel: string,
			author: string
		}
	],
	pings: [
		{
			message: string,
			channel: string,
			author: string,
			text: string,
			mentions: [{
				id: string,
				name: string
			}]
		}
	],
	raw: any
}

export interface IServerModel extends Model<IServer> {

	/**
	 * Looks up a server based on their discord guild id
	 * @param g - the discord guild object from the message
	 * @return the rod server object
	 */
	GetFromGuild(g: Discord.Guild): Promise<IServer>;

}

const s = new Schema({
	_id: String,
	name: String,
	owner: String,
	esc: { type: String, default: null },
	members: [{ type: String, ref: 'User' }],
	created: Date,
	settings: {
		botName: { type: String, default: 'Rod' },
		allowAlias: { type: Boolean, default: true },
		npcPermission: { type: String, default: 'admin' },
		tagAliases: { type: String, default: null }
	},
	ignorePrefixes: [String],
	lastMessages: Schema.Types.Mixed,
	tables: [
		{
			name: String,
			source: String,
			author: String,
			data: Schema.Types.Mixed
		}
	],
	npcs: [{
		id: String,
		name: String,
		avatar: String,
		createdBy: String,
		grant: [String],
		grantRoles: [String],
		avraeId: String,
		avrae: Schema.Types.Mixed
	}],
	rollCalls: [
		{
			message: String,
			channel: String,
			name: String,
			text: String,
			start: Date,
			completed: { type: Boolean, default: false },
			mentions: [{
				id: String,
				name: String
			}],
			npcs: [String],
			rolls: [{
				key: String,
				name: String,
				text: String,
				roll: Number,
				from: String,
				count: { type: Number, default: 0 }
			}],
			logs: [String]
		}
	],
	dones: [
		{
			message: String,
			channel: String,
			author: String
		}
	],
	pings: [
		{
			message: String,
			channel: String,
			author: String,
			text: String,
			mentions: [{
				id: String,
				name: String
			}]
		}
	],
	raw: Schema.Types.Mixed
});

s.statics.GetFromGuild = async function (g: Discord.Guild): Promise<IServer> {

	let s: IServer = await this.findOne({ _id: g.id });
	if (s) return s;

	console.log('- new server entry:', g.name, g.id);
	s = new Server();
	s._id = g.id;
	s.name = g.name;
	s.owner = g.ownerID;
	s.created = new Date(g.createdAt);
	return await s.save();
};


const Server = mongoose.model<IServer, IServerModel>('Server', s);
export default Server;

