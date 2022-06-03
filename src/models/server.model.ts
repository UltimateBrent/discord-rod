import mongoose, { Schema, Document, Model } from 'mongoose';
import Discord from 'discord.js';
import _ from 'lodash';

export interface IServer extends Document { // Typescript definition
	_id: string,
	name: string,
	owner: string,
	esc: string,
	members: string[],
	created: Date,
	settings: {
		botName: string,
		allowAlias: boolean,
		npcPermission: string,
		tagAliases: string
	},
	ignorePrefixes: string[],
	lastMessages: any,
	channelAliasTargets: any,
	tables: {
		name: string,
		source: string,
		author: string,
		data: any
	}[],
	npcs: {
		id: string,
		name: string,
		avatar: string,
		createdBy: string,
		grant?: string[],
		grantRoles?: string[],
	}[],
	rollCalls: {
		message: string,
		channel: string,
		name: string,
		text: string,
		start: Date,
		completed: boolean,
		mentions: {
			id: string,
			name: string
		}[],
		npcs: string[],
		rolls: {
			key?: string,
			name?: string,
			text?: string,
			roll?: number,
			from?: string,
			count?: number
		}[],
		logs: string[]
	}[],
	dones: {
		message: string,
		channel: string,
		author: string
	}[],
	pings: {
		message: string,
		channel: string,
		author: string,
		text: string,
		mentions: {
			id: string,
			name: string
		}[]
	}[],
	raw: any
}

const s = new Schema<IServer>({
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
	channelAliasTargets: {type: Schema.Types.Mixed, default: {}},
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
		grantRoles: [String]
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

const Server = mongoose.model<IServer>('Server', s);
export default Server;

