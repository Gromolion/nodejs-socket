import { AppDataSource } from "./data-source"
import {getMongoManager} from "typeorm";
import { User } from "./entity/User";
import { Message } from "./entity/Message";
const express = require('express'),
    app = express(),
    session = require('express-session'),
    moment = require('moment-timezone'),
    bcrypt = require('bcrypt')

moment.tz.setDefault('Europe/Moscow').locale('ru')

AppDataSource.initialize().then(async () => {

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(__dirname + '/public'));
    app.set('view engine', require('ejs').renderFile);
    app.set('views', __dirname + '/public/views');
    app.use(
        session({
            secret: 'secretkey',
            saveUninitialized: true,
        })
    );

    app.use(['/login', '/registration'], (req, res, next) => {
        if (req.session.auth) {
            res.redirect('/');
        }
        else next();
    });

    app.get('/login', (req, res) => {
        res.render('login.ejs');
    });
    app.post('/login', async (req, res) => {
        let name = req.body.name;
        let password = req.body.password;
        let user = await AppDataSource.getRepository(User).findOneBy({name: name})

        if (!user || !password) {
            res.render('login.ejs', {
                error: 'Имя пользователя или пароль неверны'
            });
        } else {
            bcrypt.compare(password, user.password)
                .then(r => {
                    if (r) {
                        req.session.auth = true;
                        req.session.name = name;

                        res.redirect('/');
                    } else {
                        res.render('login.ejs', {
                            error: 'Имя пользователя или пароль неверны'
                        });
                    }
                });
        }
    });

    app.get('/register', (req, res) => {
        res.render('register.ejs');
    });

    app.post('/register', async (req, res) => {
        let repository = AppDataSource.getRepository(User);
        let name = req.body.name;
        let password = req.body.password;
        let repeatPassword = req.body.repeatPassword;
        let errors = {
            name: undefined,
            password: undefined,
            repeatPassword: undefined
        };

        if (!name) errors.name = 'Заполните поле';
        else if (await repository.findOneBy({name: name})) errors.name = 'Имя пользователя занято';
        if (password.length < 8) errors.password = 'Минимальная длина пароля - 8 символов';
        else if (password !== repeatPassword) errors.repeatPassword = 'Пароли не совпадают';

        if (!errors.name && !errors.password && !errors.repeatPassword) {
            await bcrypt.hash(password, 10)
                .then(async (hash) => {
                    await repository.save(new User(name, hash));

                    req.session.auth = true;
                    req.session.name = name;

                    res.redirect('/');
                })
                .catch(console.error);
        } else {
            res.render('register.ejs', {
                errors: errors
            });
        }
    });

    app.use((req, res, next) => {
        if (!req.session.auth) res.redirect('/login');
        else next();
    });

    app.get('/', async (req, res) => {
        let messages = await AppDataSource.getRepository(Message).find({
            relations: {
                parent: true
            }
        });
        let users = await AppDataSource.getRepository(User).find();

        res.render('index.ejs', {
            messages: messages,
            name: req.session.name,
            users: users
        });
    });

    app.get('/logout', (req, res) => {
        req.session.auth = false;
        req.session.name = false;

        res.redirect('/login');
    });

    const server = app.listen(7000, () => {
        console.log('Сервер запущен на 7000 порту');
    });

    const io = require('socket.io')(server);

    io.on('connection', socket => {
        socket.on('newMessage', async data => {
            let user = await AppDataSource.getRepository(User).findOneBy({name: data.from});
            let parentId = data.parent;
            let parentMessage;

            if (parentId.length) parentMessage = await AppDataSource.getRepository(Message).findOneBy({id: parentId});

            let message = new Message(user, data.message, moment().format('LT'), parentMessage);

            message = (await AppDataSource.getRepository(Message).save(message));

            io.sockets.emit('addMessage', message);
        });

        socket.on('login', async data => {
            await AppDataSource.getRepository(User).update({name: data.name}, {
                online: true,
                socket: socket.id
            });
        });
        socket.on('disconnect', async () => {
            await AppDataSource.getRepository(User).update({socket: socket.id}, {
                online: false,
                socket: null
            });
        });
    });
}).catch(error => console.log(error))
