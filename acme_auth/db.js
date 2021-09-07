const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')

const { STRING } = Sequelize;
const config = {
  logging: false
};

const secretToken = process.env.JWT;

if(process.env.LOGGING){
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

// USER MODEL AND METHODS

const User = conn.define('user', {
  username: STRING,
  password: STRING
});

User.byToken = async(token)=> {
  console.log("Token: ", token)
  try {
    const verifiedUser = jwt.verify(token, secretToken)
    console.log("Verified user:", verifiedUser)
    const user = await User.findByPk(verifiedUser.id);
    if (user) {
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
  catch(ex){
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async({ username, password })=> {
  const plaintextPassword = password;
  const user = await User.findOne({
    where: {
      username: username
    }
  })
  if(user && bcrypt.compare(plaintextPassword, user.password)){
    //return user.id;
    return jwt.sign({id: user.id}, secretToken)
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

User.beforeCreate(async (user, options) => {
  const saltRounds = 10;
  const hashValue = await bcrypt.hash(user.password, saltRounds);
  user.password = hashValue
})

// NOTE MODEL

const Note = conn.define('note', {
  text: {
    type: Sequelize.STRING
  }
})

Note.belongsTo(User);
User.hasMany(Note);

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential => User.create(credential))
  );
  const notes = [
    {text: 'hello!'},
    {text: 'i like to play tennis.'},
    {text: 'i like to play piano.'}
  ]
  const [note1, note2, note3] = await Promise.all(
    notes.map( note => Note.create(note))
  )
  await lucy.setNotes([note1, note3]);
  await moe.setNotes([note2]);
  return {
    users: {
      lucy,
      moe,
      larry
    },
    notes: {
      note1,
      note2,
      note3
    }
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note
  }
};
