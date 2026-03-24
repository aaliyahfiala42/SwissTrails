require('dotenv').config;

const express = require('express');
const path = require('path');
const app = express();

const PORT = provess.env.PORT;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');


app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.render("home");
})

app.listen(PORT, '127.0.0.1', () => {
    console.log(`https://localhost:${PORT}`);
})