const { User } = require('./User.js')
const { Comment } = require('./Comment.js')
const newUser = new User("Michael", "Edwards", "THREExPENNYco", "Mememe1212", "THREExPENNYco@gmailcom")
const newComment = new Comment(0, "image", "this is a comment")
newUser.save() 
newComment.save() 
console.log(newUser)
console.log(newComment)