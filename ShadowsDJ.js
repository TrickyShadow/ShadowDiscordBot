const {Client} = require('discord.js');
const {TOKEN, PREFIX} = require('./config');
const ytdl = require('ytdl-core');

const client = new Client({disableEveryone: true});

const queue = new Map();

client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', () => console.log('Ready!'));

client.on('disconnect', () => console.log('Disconnected, reconnection now...'));

client.on('reconnecting', () => console.log('Reconnecting now!'));

client.on('message', async msg => {
   if (msg.author.bot) return undefined;
   if (!msg.content.startsWith(PREFIX)) return undefined;
   const args = msg.content.split(' ');
   const serverQueue = queue.get(msg.guild.id);

   if (msg.content.startsWith(`${PREFIX}play`)) {
      const voiceChannel = msg.member.voiceChannel;  
      if (!voiceChannel) return msg.channel.send('I\'m sorry but you need to be in a voice channel to play music!' );
      const permissions = voiceChannel.permissionsFor(msg.client.user);
      if (!permissions.has('CONNECT')) {
          return msg.channel.send('I cannot connect to your voice channel, make sure i have the proper permissions!');
      }
      if (!permissions.has('SPEAK')) {
         return msg.channel.send('I cannot speak in this voice channel, make sure i have the proper permissions!'); 
      }

      const songInfo = await ytdl.getInfo(args[1]);
      const song = {
          title: songInfo.title,
          url: songInfo.video_url
      };
      if (!serverQueue) {
          const queueConstruct = {
              textChannel: msg.channel,
              voiceChannel: voiceChannel,
              connection: null,
              songs: [],
              volume: 5,
              playing: true
          };
          queue.set(msg.guild.id, queueConstruct);

          queueConstruct.songs.push(song);

          try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(msg.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`I could not join the voice channel: ${error}`);
            queue.delete(msg.guild.id);  
            return msg.channel.send(`I could not join the voice channel: ${error}`);
        }
      } else {
          serverQueue.songs.push(song);
          console.log(serverQueue.songs);
          return msg.channel.send(`**${song.title}** has been added to the queue`);
      }
      return undefined;
   } else if (msg.content.startsWith(`${PREFIX}skip`)) {
       if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel.');
       if (!serverQueue) return msg.channel.send('There is nothing to skip');
       serverQueue.connection.dispatcher.end();
       return undefined;
   } else if (msg.content.startsWith(`${PREFIX}stop`)) {
       if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel.');
       if (!serverQueue) return msg.channel.send('There is nothing to stop');
       serverQueue.songs = [];
       serverQueue.connection.dispatcher.end();
       return undefined;
   }
   return undefined;
});

function play(guild, song) {
   const serverQueue = queue.get(guild.id);

   if (!song) {
       serverQueue.voiceChannel.leave();
       queue.delete(guild.id);
       return;
   }
   
   const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
        .on('end', () => {
            console.log('song ended!');
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    
    serverQueue.textChannel.send(`Now playing: ${song.title}`);
}
client.login(TOKEN); 