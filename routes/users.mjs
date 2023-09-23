import express from 'express'
import asyncHandler from 'express-async-handler'
import Joi from 'joi'
import { validate } from '../middleware/validation.mjs';
import UsersService from '../service/UsersService.mjs';
import authVerification from '../middleware/authVerification.mjs';
export const users = express.Router();
const usersService = new UsersService()
const schema = Joi.object({
    username: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    roles: Joi.array().items(Joi.string().valid('ADMIN', 'USER')).required(),
    status: Joi.string().valid('ACTIVE', 'BLOCKED').default('ACTIVE')  
})
users.use(validate(schema))
users.post('', asyncHandler(async (req, res) => {
    const { roles } = req.body;
    if (roles.includes('ADMIN') && !req.user) {
        res.status(401).send('Admin accounts must be created using a bearer token');
        return;
    }

    if (roles.includes('ADMIN') && !req.user.roles.includes('ADMIN_ACCOUNTS')) {
        res.status(403).send('You do not have permission to create admin accounts');
        return;
    }

    const accountRes = await usersService.addAccount({...req.body, status: req.body.status || 'ACTIVE'});
    if (accountRes == null) {
        res.status(400).send(`account ${req.body.username} already exists`);
        return;
    }

    res.status(201).send(accountRes);
}));

users.get("/:username",authVerification("ADMIN_ACCOUNTS", "ADMIN", "USER"), asyncHandler(
    async (req,res) => {
        const username = req.params.username;
      
        const account = await usersService.getAccount(username);
        if (!account) {
            res.status(404);
            throw `account ${username} notfound`
        }
        res.send(account);
    }
));
users.post("/login", asyncHandler(
    async (req, res) => {
        const loginData = req.body;
        const accessToken = await usersService.login(loginData);
        if (!accessToken) {
            res.status(400);
            throw 'Wrong credentials'
        }
        res.send({accessToken});
    }
))

users.delete('/:username', authVerification('ADMIN'), asyncHandler(async (req, res) => {
    await usersService.deleteUser(req.params.username);
    res.status(204).send();
}));

users.patch('/:username/status', authVerification('ADMIN'), asyncHandler(async (req, res) => {
    await usersService.updateUserStatus(req.params.username, req.body.status);
    res.status(204).send();
}));
