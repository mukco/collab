// User model
const { User } = require('./models/User.js');
const { Comment } = require('./models/Comment.js');
const { Group } = require('./models/Group.js');
const { Goal } = require('./models/Goal.js');
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const { sendInviteEmail } = require('./mailer.js');

const checkSesssionAndSessionId = (session, sessionUserId) => {
	!(session && sessionUserId) ? false : true;
};
// Index route
router.route('/').get((req, res) => {
	res.sendFile(path.resolve('dist/index.html'));
});
// Login route
router.route('/login').post((req, res) => {
	User.findOne({ userName: req.body.userName }, (err, user) => {
		if (!user || !bcrypt.compareSync(req.body.passWord, user.passWord)) {
			res.status(401).json(err);
			return;
		}
		user.passWord = null;
		req.session.userId = user._id;
		req.session.userName = user.userName;
		res.status(201).json(user);
	});
});
// Route for user filtered by id
router.route('/users/user_name=:user_name/get_user').get((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	User.findOne({ userName: req.params.user_name })
		.then((user) => {
			user.passWord = null;
			res.status(200).json(user);
		})
		.catch((err) => res.status(403).json(err));
});
// New user route
router.route('/users/new_user').post((req, res) => {
	const userName = req.body.userName;
	const passWord = req.body.passWord;
	const hash = bcrypt.hashSync(passWord, 8);
	const email = req.body.email;
	const newUser = new User({
		userName: userName,
		passWord: hash,
		email: email,
	});
	newUser
		.save()
		.then((newUser) => res.status(201).json(newUser))
		.catch((err) => res.status(403).json(err));
});
// route that returns information about the user
router.route('/users/curr_user=:curr_user/get_user').get((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	User.findOne({ userName: req.params.curr_user })
		.then((user) => {
			res.status(200).json(user);
		})
		.catch((err) => {
			res.status(404).json(err);
		});
});
//dashboard route
router.route('/users/curr_user=:curr_user/get_user_dashboard').get((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	User.findOne({ userName: req.params.curr_user })
		.then((user) => {
			res.status(200).json(user);
		})
		.catch((err) => {
			res.status(404).json(err);
		});
});
// route that pulls up group dashboard
router.route('/group_dashboard/group_id=:group_id/get_group_dashboard').get((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	Group.findOne({ _id: req.params.group_id })
		.then((dashboard) => {
			res.status(200).json(dashboard);
		})
		.catch((err) => {
			res.status(404).json(err);
		});
});
// route to grab members in the group
router.route('/group_dashboard/group_id=:group_id/get_members').get((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	Group.findById(
		req.params.group_id
	)
		.then((group) => {
			res.status(200).json(group.peers);
		})
		.catch((err) => {
			res.status(404).json(err);
		});
});
//route to grab goals in the group
router.route('/group_dashboard/group_id=:group_id/get_goals').get((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	Goal.find({ groupId: req.params.group_id })
		.then((goals) => {
			res.status(200).json(goals);
		})
		.catch((err) => {
			res.status(404).json(err);
		});
});
//route to get group comments
router.route('/group_dashboard/group_id=:group_id/get_comments').get((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	Comment.find({ group: req.params.group_id })
		.sort({ createdAt: 'desc' }) // sorts list with createdAt descending
		.then((comment) => {
			res.status(200).json(comment);
		})
		.catch((err) => {
			res.status(404).json(err);
		});
});
// route to create group and add user that created group to group
router.route('/groups/user_id=:user_id/create_group').post((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	const createdBy = req.body.createdBy;
	const groupName = req.body.groupName;
	const newGroup = new Group({
		createdBy: createdBy,
		groupName: groupName,
	});
	newGroup
		.save()
		.then((newGroup) => {
			res.status(200).json(newGroup._id);
		})
		.catch((err) => res.status(404).json(err));
});
// add group to user array
router.route('/groups/user_id=:user_id/group_to_user').post((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	User.findByIdAndUpdate(
		req.params.user_id,
		{ $push: { groups: { groupId: req.body.groupId, groupName: req.body.groupName } } },
		function (err, model) {
			err ? res.status(404).json(err) : res.status(200).json(model);
		}
	);
});
// invite user to the group
router.route('/groups/group_id=:group_id/invite_user').post((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	User.findOne({ email: req.body.email }, (err, user) => {
		let newEmail;
		user ? (newEmail = user.email) : (newEmail = req.body.email);
		if (err) {
			res.status(404).json(err);
			return;
		}
		res.status(200).json(user);
		sendInviteEmail(newEmail, req.params.group_id);
	});
});
// route to add user to group array
router.route('/groups/group_id=:group_id/add_user_to_group').post((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	Group.findByIdAndUpdate(
		req.params.group_id,
		{ $push: { peers: { peerId: req.body.peerId, peerName: req.body.peerName }  } },
		function (err, group) {
			err ? res.status(404).json(err) : res.status(200).json(group);
		}
	);
});
// find group
router.route('/groups/user_id=:user_id/find_groups').get((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	Group.find({ members: req.params.user_id })
		.then((groups) => {
			res.status(200).json(groups);
		})
		.catch((err) => {
			res.status(404).json(err);
		});
});
// find goals for specific member
router.route('/goals/curr_user=:curr_user/find_goals').get((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	Goal.find({ 'createdBy.userName': req.params.curr_user })
		.then((goals) => {
			res.status(200).json(goals);
		})
		.catch((err) => {
			res.status(404).json(err);
		});
});
// create goal and add to group
router.route('/goals/group_id=:group_id/create_goal').post((req, res) => {
	console.log(req.session);
	console.log(req.session.userId);
	console.log(req.session.userName);
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	const goalName = req.body.goalName;
	const goal = req.body.goal;
	const goalStep = req.body.goalStep;
	const groupId = req.params.group_id;
	const goalDuration = new Date(req.body.goalDuration);
	const newGoal = new Goal({
		createdBy: {
			userId: req.session.userId,
			userName: req.session.userName,
		},
		groupId: groupId,
		goal: goal,
		goalName: goalName,
		goalStep: goalStep,
		goalDuration: goalDuration,
	});
	newGoal
		.save()
		.then((newGoal) =>
			Group.findByIdAndUpdate(
				req.params.group_id,
				{ $push: { goals: newGoal._id } },
				{ useFindAndModify: false }
			)
		)
		.then((newGoal) => res.status(200).json(newGoal))
		.catch((err) => res.status(404).json(err));
});
// route to add goalstep
router.route('/goals/goal_id=:goal_id/create_goalstep').post((req, res) => {
	if (checkSesssionAndSessionId(req.session, req.session.userId)) return res.status(401);
	const newGoalStep = req.body.newGoalStep;
	Goal.findByIdAndUpdate(
		// refactor so code isn't so dry but works for now
		req.params.goal_id,
		{ $push: { goalStep: newGoalStep } },
		function (err, model) {
			err ? res.status(404).json(err) : res.status(200).json(newGoalStep);
		}
	);
});

module.exports = router;
