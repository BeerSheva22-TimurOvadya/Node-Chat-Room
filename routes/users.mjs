import express from 'express';
import asyncHandler from 'express-async-handler';
import Joi from 'joi';
import { validate } from '../middleware/validation.mjs';
import UsersService from '../service/UsersService.mjs';
import authVerification from '../middleware/authVerification.mjs';
import { chatRoom } from '../chat-appl.mjs';
export const users = express.Router();
const usersService = new UsersService();

const schema = Joi.object({
    username: Joi.string().email().required(),
    nickname: Joi.string().min(3).max(15).required(),
    password: Joi.string().min(8).required(),
    roles: Joi.array().items(Joi.string().valid('ADMIN', 'USER')).default(['USER']),
    status: Joi.string().valid('ACTIVE', 'BLOCKED').default('ACTIVE'),
});
// users.use(validate(schema));
users.post(
    '',
    validate(schema),
    asyncHandler(async (req, res) => {
        const roles = req.body.roles || ['USER'];
        if (roles.includes('ADMIN') && !req.user) {
            res.status(401).send('Admin accounts must be created using a bearer token');
            return;
        }

        if (roles.includes('ADMIN') && !req.user.roles.includes('ADMIN_ACCOUNTS')) {
            res.status(403).send('You do not have permission to create admin accounts');
            return;
        }

        const accountRes = await usersService.addAccount({
            ...req.body,
            roles,
            status: req.body.status || 'ACTIVE',
        });

        if (accountRes == null) {
            res.status(400).send(`account ${req.body.username} already exists`);
            return;
        }

        res.status(201).send(accountRes);
    }),
);

users.get(
    '/',
    asyncHandler(async (req, res) => {
        const allAccounts = await usersService.getAllAccounts();
        const clientsWithStatus = allAccounts.map((account) => ({
            ...account,
            onlineStatus: chatRoom.getUserStatus(account.username),
        }));
        if (!allAccounts || allAccounts.length === 0) {
            return res.status(404).send('No users found');
        }
        res.send(clientsWithStatus);
    }),
);
users.post(
    '/login',
    asyncHandler(async (req, res) => {
        const loginData = req.body;
        const accessToken = await usersService.login(loginData);
        if (!accessToken) {
            res.status(400);
            throw 'Wrong credentials';
        }
        chatRoom.setUserStatus(loginData.username, 'ONLINE');        
        res.send({ accessToken });
        
    }),
);

users.post(
    '/logout',
    asyncHandler(async (req, res) => {
        const logoutData = req.body;
        chatRoom.setUserStatus(logoutData.username, 'OFFLINE');       
        res.send({ message: 'Logged out successfully' }); 
    }),
);

users.delete(
    '/:username',
    authVerification('ADMIN'),
    asyncHandler(async (req, res) => {
        const user = await usersService.getAccount(req.params.username);
        if (!user) {
            return res.status(404).send(`User ${req.params.username} does not exist`);
        }
        await usersService.deleteUser(req.params.username);

        res.status(201).send(`User ${req.params.username} has been deleted`);
    }),
);

users.put(
    '/:username/status',
    authVerification('ADMIN'),
    asyncHandler(async (req, res) => {
        const user = await usersService.getAccount(req.params.username);
        if (!user) {
            return res.status(404).send(`User ${req.params.username} does not exist`);
        }

        const newStatus = req.body.status;
        if (!['ACTIVE', 'BLOCKED'].includes(newStatus)) {
            return res.status(400).send('Invalid status, must be either ACTIVE or BLOCKED');
        }

        if (user.status === newStatus) {
            return res.status(400).send(`User ${req.params.username} is already ${newStatus}`);
        }

        await usersService.updateUserStatus(req.params.username, newStatus);
        res.status(201).send(`User ${req.params.username} status was changed to ${newStatus}`);
    }),
);
