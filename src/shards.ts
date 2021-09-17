import {ShardingManager } from 'discord.js';
import Secrets from './secrets.json';

const flags: any = {};
for (let i = 2; i < process.argv.length; i++) {
	const a = process.argv[i].split('=');
	flags[a[0]] = a[1] || true;
}

const manager = new ShardingManager('./dist/rod.js', {
	token: Secrets['discordToken' + (flags.tokenType || '')],
	shardArgs: process.argv,
});
manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
if (flags.dev) {
	manager.spawn({amount: 1});
} else {
	manager.spawn();
}