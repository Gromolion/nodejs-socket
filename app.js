const express = require('express'),
    app = express(),
    session = require('express-session'),
    moment = require('moment-timezone'),
    db = require('./db')
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

app.use('/login', (req, res, next) => {
    if (req.session.auth) {
        res.redirect('/');
    }
    else next();
});

app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.post('/login', (req, res) => {
    db.getDb()
        .then(async db => {
            let collection = db.collection('users');
            let name = req.body.name;
            let user = await collection.findOne({name: name});
            if (!user) {
                await collection.insertOne({name: name});
            }

            req.session.auth = true;
            req.session.name = name;

            res.redirect('/');
        })
        .catch(console.error)
        .finally(() => db.client.close());
});

app.use((req, res, next) => {
    if (!req.session.auth) res.redirect('/login');
    else next();
});

app.get('/', (req, res) => {
    db.getDb()
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

        db.getDb()
            .then(async db => {
                await db.collection('messages').insertOne(message);

                io.sockets.emit('addMessage', message);
            })
            .catch(console.error)
            .finally(() => db.client.close());
    });
});