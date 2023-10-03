import bodyParser from 'body-parser';
import express from 'express';
import crypto from 'node:crypto';
import morgan from 'morgan';
import expressWs from 'express-ws';

import errorHandler from './middleware/errorHandler.mjs';
import ChatRoom from './service/ChatRoom.mjs';
import { messagesRouter } from './routes/messages.mjs';
import { users } from './routes/users.mjs';
import config from 'config';
import cors from 'cors';
import auth from './middleware/auth.mjs';
import MessagesService from './service/MessagessService.mjs';
import UsersService from './service/UsersService.mjs';


const app = express();
const expressWsInstant = expressWs(app);


export const chatRoom = new ChatRoom();
const messagesService = new MessagesService();
const usersService = new UsersService();


app.use(cors());
app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use(auth);

app.use('/messages', messagesRouter);
app.use('/users', users);


app.get('/users', (req, res) => {
    res.send(chatRoom.getClients());
});



app.ws('/users/websocket', (ws, req) => {
    const clientName = ws.protocol || req.query.clientName;
    if (!clientName) {
        ws.send('Must be client name');
        ws.close();
    } else {
        processConnection(clientName, ws);
    }
});



// app.ws('/users/websocket/:clientName', (ws, req) => {
//     const clientName = req.params.clientName;
//     processConnection(clientName, ws);
// });



const port = process.env.PORT || config.get('server.port');
const server = app.listen(port);
server.on('listening', () => console.log(`server is listening on port ${server.address().port}`));
app.use(errorHandler);

function processConnection(clientName, ws) {
    const connectionId = crypto.randomUUID();
    chatRoom.addConnection(clientName, connectionId, ws);

    sendUnreadMessages(clientName, ws);
    chatRoom.setUserStatus(clientName, 'ONLINE'); 

    ws.on('close', () => {        
        chatRoom.removeConnection(connectionId);
        chatRoom.setUserStatus(clientName, 'OFFLINE');
        
    });
    ws.on('message', processMessage.bind(undefined, clientName, ws));
}

async function sendUnreadMessages(clientName, ws) {
    try {
        const unreadMessages = await messagesService.getUnreadMessages(clientName);
        unreadMessages.forEach((msg) => {
            ws.send(JSON.stringify({ from: msg.from, text: msg.text }));
        });        
        await messagesService.markMessagesAsRead(clientName);
    } catch (error) {
        console.error("Error sending unread messages", error);
    }
}

async function processMessage(clientName, ws, message) {
    try {
        const messageObj = JSON.parse(message.toString());
        const to = messageObj.to;
        const text = messageObj.text;

        if (!text) {
            ws.send("Your message doesn't contain text");
            return;
        }
        
        if (!to) {
            ws.send("Recipient is not specified");
            return;
        }
        
        const userExists = await usersService.getAccount(to);
        if (!userExists) {
            ws.send(`Error: User ${to} does not exist`);
            return;
        }
        
        const objSent = JSON.stringify({ from: clientName, text });
        const recipients = chatRoom.getClientWebSockets(to);        
        const isRecipientOnline = recipients && recipients.length > 0;

        if (isRecipientOnline) {
            sendClient(objSent, to, ws);
            await messagesService.saveMessage(clientName, to, text, true);
        } else {
            await messagesService.saveMessage(clientName, to, text, false);
        }

    } catch (error) {
        ws.send('wrong message structure');
    }
}

function sendClient(message, client, socketFrom) {
    const clientSockets = chatRoom.getClientWebSockets(client);
    if (clientSockets.length == 0) {
        socketFrom.send(client + " contact doest't exist");
    } else {
        clientSockets.forEach((s) => s.send(message));
        
    }
}
