import mongoose, { Schema, Document, Model } from 'mongoose';
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

const s = new Schema<IUser>({
	_id: String,
	name: String,
	serverSettings: Schema.Types.Mixed,
	settings: { // overwritten by server settings on load, these are defaults only
		macros: [{
			name: String,
			roll: String
		}],
		autoAlias: { type: String, default: null } // npc.id
	}
});

const User = mongoose.model<IUser>('User', s);
export default User;

