const express = require('express');
const path = require('path');
const db = require('./data');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

app.get('/api/db', (req, res) => res.json(db));

app.listen(PORT, () => {
  console.log(`CivRegime visualizer → http://localhost:${PORT}`);
});
