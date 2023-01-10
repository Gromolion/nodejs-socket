const express = require('express'),
    app = express(),
    session = require('express-session'),
    fs = require('fs')

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.set('view engine', require('ejs').renderFile);
app.set('views', __dirname + '/public/views');

function getUsers() {
    return JSON.parse(fs.readFileSync('users.json', 'utf-8'));
}

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
    let users = getUsers();

    if (!users.includes(req.body.name)) {
        users.push(req.body.name);
        fs.writeFile('users.json', JSON.stringify(users), (err) => {
            if (err) throw err;
        });
    }

    req.session.auth = true;
    req.session.name = req.body.name;

    res.redirect('/');
});

app.use((req, res, next) => {
    if (!req.session.auth) res.redirect('/login');
    else next();
});

app.get('/', (req, res) => {
    let messages = JSON.parse(fs.readFileSync('messages.json', 'utf-8'));

    res.render('index.ejs', {
        messages: messages,
        name: req.session.name,
        users: getUsers()
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
    socket.on('newMessage', data => {
        let time = new Date();

        let hours = time.getHours();
        hours = hours < 10 ? `0${hours}` : hours;
        let minutes = time.getMinutes();
        minutes = minutes < 10 ? `0${minutes}` : minutes;

        let message = {from: data.from, text: data.message, time: hours + ':' + minutes};

        fs.readFile('messages.json', 'utf-8', (err, data) => {
            if (err) throw err;
            let messages = JSON.parse(data);
            messages.push(message);

            fs.writeFile('messages.json', JSON.stringify(messages), (err) => {
                if (err) throw err;
            });
        });

        io.sockets.emit('addMessage', message);
    });
});