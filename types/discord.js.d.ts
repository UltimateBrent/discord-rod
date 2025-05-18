declare module 'discord.js' {
export class Client { [key: string]: any; }
export class Message { [key: string]: any; }
export class GuildMember { [key: string]: any; }
export class Role { [key: string]: any; }
export class User { [key: string]: any; }
export class TextChannel { [key: string]: any; }
export class ThreadChannel { [key: string]: any; }
export type ColorResolvable = any;
export class MessageEmbed { [key: string]: any; }
export class Permissions { [key: string]: any; }
export class Util { [key: string]: any; }
export class Webhook { [key: string]: any; }
export class Guild { [key: string]: any; }
export class Collection<K, V> extends Map<K, V> {
first(): V;
last(): V;
}
export class ShardingManager {
constructor(file: string, options: any);
spawn(...args: any[]): any;
on(...args: any[]): any;
}
const Discord: any;
export = Discord;
}
