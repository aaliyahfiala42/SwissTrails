require('dotenv').config;

const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const {parse} = require('csv-parse/sync');

const PORT = process.env.PORT || 3007;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');


app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


function loadTrails() {
    const data = path.join(__dirname, 'data', 'trails.csv');
    const file = fs.readFileSync(data, 'utf8');
    const records = parse(file, {
        columns:true,
        skip_empty_lines:true,
        trim:true,
    });

    return records.map((row) => ({
        trail_name:row.trail_name,
        latitude:Number(row.latitude),
        longitude:Number(row.longitude),
    })).filter((row) => row.trail_name &&
        Number.isFinite(row.latitude) &&
        Number.isFinite(row.longitude)
    );
}

app.get('/', (req, res) => {
    const trails = loadTrails();
    res.render("pages/landing", {trails});
})

app.listen(PORT, '127.0.0.1', () => {
    console.log(`http://localhost:${PORT}`);
})