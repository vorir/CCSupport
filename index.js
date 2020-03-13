const fs = require('fs');
const Discord = require('discord.js');
const _ = require('lodash');

const logger = require('./lib/logger')
const supporting = require('./lib/supporting');
const config = require('./config.json');


const client = new Discord.Client();


var reportIssueChannel;
var adminLogChannel;
var moderatorLogChannel;
var issueChannels = [];

try{fs.mkdirSync('./data');}catch(ex){}
client.on('ready', () => {
    logger.log('info', 'The bot is online!');
    client.guilds.forEach((guild)=>logger.log('info',`Signed in to: ${guild.name}`));
    client.user.setActivity("with your emotions.");
    reportIssueChannel = client.channels.get(config.issueChannel);
    adminLogChannel = client.channels.get(config.adminLogChannel);
    moderatorLogChannel = client.channels.get(config.moderatorLogChannel);
    //GET ACTIVE ISSUE CHANNELS.
    refreshIssueChannels();
});


//TODO: Handle websocket disconnect on error
client.on('disconnect', (e) =>{
    logger.log('error','DISCONNECT DETECTED '+e)
});

client.on('debug', m=>logger.log('debug',m));
client.on('warn', m=>logger.log('warn',m));

process.on('uncaughtException',error=>logger.log('error',error));

client.on('message', msg=>
{
    if(issueChannels.some(channel=>channel.name===msg.channel.name)) //Handling issue channel commands
    {
        let attachmentURLs=[];
        msg.attachments.forEach(o=>{
            attachmentURLs.push(o.proxyURL); //Add any attachments in the message (this includes images)
        });

        try{
            fs.appendFileSync(`./data/${msg.channel.id}`,JSON.stringify({   msg:{author:{username:msg.author.username},content:msg.content},attachments:attachmentURLs})+',\n');//Log all conversation data into a file in the event the bot restarts
        }catch(ex)
        {
            logger.log('warn',ex.message);
        } 

        if(msg.content=='!escalate'&& msg.member.roles.some(role=>role.id===config.moderatorRoleID)) //handle escalate event. 
        { 
            if(msg.channel.name.indexOf('admin')>=0) return;
            msg.channel.setName('admin'+msg.channel.name).then(o=>{
                logger.log('info',`Updated channel name to ${msg.channel.name}`);
                var modRole = msg.channel.permissionOverwrites.get(config.moderatorRoleID);
                if(modRole) modRole.delete();
            }).catch(e=>logger.log('error',e));
            
            
            
            msg.channel.send(`Issue escalated to Administrators.`); 
        }

        if(msg.content==='!closeissue') //Handle close issue
        { 
            supporting.closeIssue(msg);
        }
    }

    if(msg.channel===reportIssueChannel&&!msg.author.bot) //Create a new issue log
    { 
        if(msg.channel===reportIssueChannel&&!msg.author.bot)
        {
            var chanTitle = `issue-${msg.member.id}`;
            var permissionArray= [
                {
                    id: msg.guild.defaultRole.id,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: msg.member.id,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: config.adminRoleID,
                    allow: ['VIEW_CHANNEL']
                }
            ];
            if(msg.content.indexOf('moderator')==-1){
                permissionArray.push({
                    id: config.moderatorRoleID,
                    allow: ['VIEW_CHANNEL']
                });
            }else{chanTitle='admin'+chanTitle;}

            var existingChannel = msg.guild.channels.filter(chan=>chan.name.indexOf(msg.member.id)>-1).first();
            if(existingChannel){
                //THERE ALREADY IS AN ISSUE CHANNEL
                existingChannel.send(`<@${msg.author.id}> You already have an active issue.`);
                msg.delete();
                return;
            }

            msg.guild.createChannel(
                chanTitle, 'text', permissionArray).then((channel)=>{
                    //SEND ISSUE TO CHANNEL
                    channel.setParent(config.openIssueCategory).then(o=>logger.log('info', `Set category of ${o.name} to ${o.parent.name}`)).catch(e=>logger.log('error',e));
                    channel.setTopic(msg.member.id).then(o=>logger.log('info',`Set topic of ${o.name} to ${o.topic}`));          
                    var issueEmbed = new Discord.RichEmbed()
                        .setColor('#ff9900')
                        .setTitle('New Ticket Created')
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL)
                        .setDescription(msg.content)
                        .setTimestamp();
                    issueChannels.push(channel);
                    channel.send(issueEmbed).then(o=>{
                        channel.send(`<@${msg.author.id}>, your issue has been opened. \n        Issue Description: \`${msg.content}\`\n Please wait for the next available moderator. If this is an issue with a moderator you can ask a moderator or administrator to !escalate the issue.`);
                    });
            });
            msg.delete();
        }   
    }
    if(!msg.content.startsWith(config.prefix) || msg.author.bot) return;
});


const refreshIssueChannels = () => {
    issueChannels = [];
    client.channels.filter(channel=>(channel.name.startsWith('issue-')||channel.name.startsWith('adminissue-'))&&channel.name!='issue-discussion').forEach(o=>issueChannels.push(o));
    logger.log('debug',`found ${issueChannels.length} channels`);
}

client.login(config.token);