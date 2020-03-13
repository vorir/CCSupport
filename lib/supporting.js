const Discord = require('discord.js');
const fs = require('fs');

const config = require('../config.json');
const logger = require('./logger');


const closeIssue = (msg) => {
    logger.log('info','closing issue ');
    msg.channel.fetchMessages().then(o=>finishClose(msg,o));
}

const finishClose = (msg) =>{
    let curMessage = '';
    let issueOutput = [];
    let issueSummary = new Discord.RichEmbed()
        .setColor('#00CCCC')
        .setTitle('Ticket Closed')
        .setDescription(`Issue Opened At: ${msg.channel.createdAt}\nIssue Closed At:${new Date()}`)
        .setTimestamp();
    issueOutput.push(issueSummary);
    let chatData = fs.readFileSync(`./data/${msg.channel.id}`);
    logger.log('debug',`{"data":[${chatData.slice(0,-2)}]}`);
    let messages = JSON.parse(`{"data":[${chatData.slice(0,-2)}]}`);
    messages.data.forEach(message =>{
         if(message.msg.content.trim().length>0||message.attachments.length>0){
            if(curMessage.length+`**${message.msg.author.username}:**  ${message.msg.content}\n\n`.length>1000){
                issueOutput.push(curMessage);
                curMessage='';
            }
            curMessage+=`**${message.msg.author.username}:**  ${message.msg.content}\n\n`;
            if(message.attachments.length>0){
                message.attachments.forEach(o=>curMessage+=o+'\n');
                issueOutput.push(curMessage);
                curMessage='';
            }
        }
    });
    
    issueOutput.push(curMessage);
    
    let x=0;
    //GET AUTHOR ID
    try{
        var ticketOpenedBy = msg.channel.members.filter(mb=>mb.id===msg.channel.topic).first();
        if(!ticketOpenedBy) ticketOpenedBy = msg.channel.members.filter(mb=>mb.id==msg.channel.name.split('-')[1]).first();
        sendDMMessage(ticketOpenedBy,issueOutput);
    }catch(ex){}

    var sendChannel = msg.client.channels.get(msg.channel.name.startsWith('admin')?config.adminLogChannel:config.moderatorLogChannel);
    setTimeout(function run() {
        if(x<issueOutput.length){
            sendChannel.send(issueOutput[x]);
            x++;
            setTimeout(run,100)
        }
    },100);
    logger.log('info',`Closed issue ${msg.channel.name}`);
    msg.channel.delete('Issue Closed');
    try{fs.unlinkSync(`./data/${msg.channel.id}`);}catch(ex){}
    
}

const sendDMMessage = async (author, messageArray)=>{
    author.createDM().then(dmchan =>{
        let x=0;
        dmchan.send('The following is a transcript of your recent report issue on Candlelight Cove.');
        setTimeout(function run() {
            if(x<messageArray.length){
                dmchan.send(messageArray[x]);
                x++;
                setTimeout(run,100)
            }
        },100);
    },(rej)=>{
        logger.log('warn',rej)
    });
    
}



module.exports = {
    closeIssue: closeIssue
}