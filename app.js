const express = require('express'),
    app = express(),
    session = require('express-session'),
    moment = require('moment-timezone'),
    db = require('./db'),
    bcrypt = require('bcrypt')
require('dotenv').config();

moment.tz.setDefault('Europe/Moscow').locale('ru')

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

app.post('/login', (req, res) => {
    db.connect()
        .then(async db => {
            let collection = db.collection('users');
            let name = req.body.name;
            let password = req.body.password;
            let user = await collection.findOne({name: name});

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
        })
        .catch(console.error)
        .finally(() => db.client.close());
});

app.get('/register', (req, res) => {
   res.render('register.ejs');
});

app.post('/register', (req, res) => {
   db.connect()
       .then(async db => {
           let collection = db.collection('users');
           let name = req.body.name;
           let password = req.body.password;
           let repeatPassword = req.body.repeatPassword;

           let errors = {};
           if (!name) errors.name = 'Заполните поле';
           else if (await collection.findOne({name: name})) errors.name = 'Имя пользователя занято';
           if (password.length < 8) errors.password = 'Минимальная длина пароля - 8 символов';
           else if (password !== repeatPassword) errors.repeatPassword = 'Пароли не совпадают';

           if (!errors.length) {
               await bcrypt.hash(password, 10)
                   .then((hash) => {
                       collection.insertOne({
                           name: name,
                           password: hash,
                           online: false,
                           socket: false
                       }).then(() => {
                           req.session.auth = true;
                           req.session.name = name;

                           res.redirect('/');
                       })
                   })
                   .catch(console.error);
           } else {
               res.render('register.ejs', {
                   errors: errors
               });
           }
       })
       .catch(console.error)
});

app.use((req, res, next) => {
    if (!req.session.auth) res.redirect('/login');
    else next();
});

app.get('/', (req, res) => {
    db.connect()
        .then(async db => {
            let messages = await db.collection('messages').find().toArray();
            let users = await db.collection('users').find().toArray();
            console.log(users)

            res.render('index.ejs', {
                messages: messages,
                name: req.session.name,
                users: users
            });
        })
        .catch(console.error)
        .finally(() => db.client.close());
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
    socket.on('newMessage', data => {
        let message = {from: data.from, text: data.message, time: moment().format('LT')};

        db.connect()
            .then(async db => {
                await db.collection('messages').insertOne(message);

                io.sockets.emit('addMessage', message);
            })
            .catch(console.error)
            .finally(() => db.client.close());
    });

    socket.on('login', data => {
        db.connect()
            .then(async db => {
                await db.collection('users').updateOne({name: data.name}, {
                    $set: {
                        online: true,
                        socket: socket.id
                    }
                });
            })
            .catch(console.error);
    });
    socket.on('disconnect', () => {
        db.connect()
            .then(async db => {
                await db.collection('users').updateOne({socket: socket.id}, {
                    $set: {
                        online: false,
                        socket: false
                    }
                });
            })
            .catch(console.error)
            .finally(() => db.client.close());
    });
});