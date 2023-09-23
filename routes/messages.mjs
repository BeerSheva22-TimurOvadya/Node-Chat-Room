import express from 'express';
import asyncHandler from 'express-async-handler';
import authVerification from '../middleware/authVerification.mjs';
import MessagesService from '../service/MessagessService.mjs';

export const messagesRouter = express.Router();
const messagesService = new MessagesService();

messagesRouter.use(authVerification('ADMIN', 'USER'));

messagesRouter.get('/', asyncHandler(async (req, res) => {
    const messages = req.user.roles.includes('ADMIN')
        ? await messagesService.getAllMessages()
        : await messagesService.getUserMessages(req.user.username);
    res.send(messages);
}));

messagesRouter.delete('/:messageId', asyncHandler(async (req, res) => {
    await messagesService.deleteMessage(req.params.messageId);
    res.status(204).send();
}));
