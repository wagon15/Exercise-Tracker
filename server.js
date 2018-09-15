'use strict'

const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

/***  my code */
//  create mongoDB schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  log: [{
    description: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: new Date().toUTCString()
    }
  }]
});
//  create a model of this schema
const User = mongoose.model('User', userSchema);

app.route('/api/exercise/new-user')
  .post( (req, res) => {
  // if(req.body.username)
  User.findOne({username: req.body.username}, (err, user) => {
    if(user) {
      return res.send('username already taken');
    }
    new User({username: req.body.username})
      .save()
      .then(doc => res.json({username: doc.username, _id: doc.id}))
      .catch(err => res.json(err));
  });
});

app.get('/api/exercise/users', (req, res) => {
  User.find({}, 'username id')
    .then(docs => {
      res.json(docs);
    })
    .catch(err => res.json(err) );
});

app.post('/api/exercise/add', (req, res) => {
  const logger = {description: req.body.description, duration: req.body.duration, date: req.body.date};
  User.findByIdAndUpdate(req.body.userId, {$push: { log: logger}}, {new: true}).exec()
    .then( user => res.json({id: user.id, username: user.username, log: user.log[user.log.length-1]}))
    .catch( err => res.json(err) );
});

app.get('/api/exercise/log'/*?{userId}[&from][&to][&limit]*/, (req, res) => {
  User.findById(req.query.userId).exec()
  .then( user => {
    let newLog = user.log;
    if (req.query.from){
      newLog = newLog.filter( x =>  x.date.getTime() > new Date(req.query.from).getTime() );}
    if (req.query.to)
      newLog = newLog.filter( x => x.date.getTime() < new Date(req.query.to).getTime());
    if (req.query.limit)
      newLog = newLog.slice(0, req.query.limit > newLog.length ? newLog.length : req.query.limit);
    user.log = newLog;
    let temp = user.toJSON();
    temp['count'] = newLog.length;

    return temp;
  })
  .then( result => res.json(result))
  .catch(err => res.json(err));
    
});
/***    */

// // Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })


// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
