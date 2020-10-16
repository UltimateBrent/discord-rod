import Discord from 'discord.js';
import RodRequest from './rodRequest';

class RodResponse {
	req: RodRequest;
	postAs?: {
		name: string,
		avatar: string
	};
	errors: string[] = [];
	embedContent?: string;
	embedFooter?: string;
	embed?: Discord.MessageEmbed;

	constructor( req: RodRequest ) {
		this.req = req;
	}

	send( content: string ) {

	}
}

export default RodResponse;