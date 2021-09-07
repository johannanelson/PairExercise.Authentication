const express = require('express');
const app = express();
app.use(express.json());
const { models: { User, Note }} = require('./db');
const path = require('path');

const requireToken = async (req, res, next) => {
  try {
    const userData = await User.byToken(req.headers.authorization);
    req.user = userData
    next()
  }
  catch(err) {
    next(err)
  }
}

app.get('/', (req, res)=> res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async(req, res, next)=> {
  try {
    res.send({ token: await User.authenticate(req.body)});
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/auth', requireToken, async(req, res, next)=> {
  try {
    res.send(req.user);
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/users/:id/notes', requireToken, async(req, res, next) => {
  console.log("req auth", req.headers.authorization);
  try {
    const user = await User.findAll({
      include: {
        model: Note,
      },
      where: {
        id: req.params.id
      },
    })
    res.send(user[0].notes)
  }
  catch(err) {
    next(err)
  }
});

app.use((err, req, res, next)=> {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
