const mongoose = require('mongoose')
const { Schema } = mongoose

const userSchema = require('./User.js')

const goalSchema = new Schema(
  {
    createdBy:  { 
      type: mongoose.Types.ObjectId,
      ref: 'User'
    }, 
    goalName: {
      type: String,
      min: 5,
      max: 50,
      trim: true,
      required: [true, 'Goal must have a name']
    },
    goal: {
      type: String,
      min: 5,
      max: 100,
      trim: true,
      required: [true, 'Required to create a goal']
    },
    goalStep: [String]
  },
  {
    timstamps: true
  }
)

const Goal = mongoose.model('Goal', goalSchema)
module.exports = { 
  Goal, 
  goalSchema
}