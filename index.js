const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
});

const exerciseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  user_id: {
    type: String,
    required: true
  },
});

const User = mongoose.model('user', userSchema);
const Exercise = mongoose.model('exercise', exerciseSchema);

app.post('/api/users', (req, res) => {
  const { username: user_name } = req.body;
  const saveUser = new User({ username: user_name });
  saveUser.save().then((data) => {
    return res.json({
      username: data.username,
      _id: data['_id'].toString()
    });
  }).catch((err) => console.error(err));
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id: id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.json({ error: 'Invalid id' });
  }

  let date;
  if (req.body.date) {
    date = new Date(req.body.date);
  } else {
    date = new Date();
  }

  User.findOne({ _id: id }).then((user) => {
    if (user != null) {
      let saveExercise = new Exercise({
        username: user.username,
        description: req.body.description,
        duration: req.body.duration,
        date: date.toDateString(),
        user_id: id
      });

      saveExercise.save().then((data) => {
        user.date = data.date;
        user.duration = data.duration;
        user.description = data.description;

        return res.json({
          _id: id,
          username: data.username,
          description: data.description,
          duration: data.duration,
          date: data.date,
        });
      }).catch((err) => console.error(err));
    } else {
      console.log('cant find user');
      return res.json({ error: 'cant find user' });
    };
  }).catch((err) => console.error(err));
});

let filterDates = (arr, datePrev, dateCurr) => {
  let dateArr = [];
  let testDate;
  if (datePrev == "" && dateCurr == "") dateArr = arr;
  else if (datePrev != "" && dateCurr == "") {
    datePrev = new Date(datePrev);
    for (let i = 0; i < arr.length; i++) {
      testDate = new Date(arr[i].date);
      testDate.setUTCHours(0, 0, 0, 0);
      if (testDate >= datePrev) dateArr.push(arr[i]);
    }
  } else if (datePrev == "" && dateCurr != "") {
    dateCurr = new Date(dateCurr);
    for (let i = 0; i < arr.length; i++) {
      testDate = new Date(arr[i].date);
      testDate.setUTCHours(0, 0, 0, 0);
      if (testDate <= dateCurr) dateArr.push(arr[i]);
    }
  } else {
    datePrev = new Date(datePrev);
    dateCurr = new Date(dateCurr);
    for (let i = 0; i < arr.length; i++) {
      testDate = new Date(arr[i].date);
      testDate.setUTCHours(0, 0, 0, 0);
      if (testDate >= datePrev && testDate <= dateCurr) dateArr.push(arr[i]);
    }
  }

  return dateArr;
}

app.get('/api/users/:_id/logs', (req, res) => {
  const { _id: id } = req.params;
  User.findOne({ _id: id }).then((user) => {

    let limit = 0;
    if (req.query.limit != undefined) limit = req.query.limit;

    let datePrev = "";
    if (req.query.from != undefined) datePrev = req.query.from;

    let dateCurr = "";
    if (req.query.to != undefined) dateCurr = req.query.to;

    Exercise.find({ username: user.username }).then((arr) => {
      let filtered = filterDates(arr, datePrev, dateCurr);
      let arrLog = [];

      for (let i = 0; i < filtered.length; i++) {
        let obj = {
          description: filtered[i].description,
          duration: filtered[i].duration,
          date: filtered[i].date
        };
        arrLog.push(obj);
      }

      if (limit > 0) arrLog = arrLog.slice(0, limit);

      console.log("log returning: ", {
        _id: user['_id'],
        username: user.username,
        count: arrLog.length,
        log: arrLog
      });

      return res.json({
        _id: user['_id'],
        username: user.username,
        count: arrLog.length,
        log: arrLog
      });
    }).catch((err) => console.error(err));
  }).catch((err) => console.error(err));
});

app.get('/api/users', (req, res) => {
  User.find({}).then((users) => {
    let addRes = [];
    for (let i = 0; i < users.length; i++) {
      addRes.push({
        _id: users[i]['_id'],
        username: users[i].username
      });
    }

    return res.json(addRes);
  }).catch((err) => console.error(err));
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
