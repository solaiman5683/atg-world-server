const express = require('express');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const crypto = require('crypto');
require('dotenv').config();
// Initialize Port Number
const port = process.env.PORT || 5000;

// Initializing Application
const app = express();

// Application MiddleWare
app.use(express.json());

// MongoDB Connection
const uri = process.env.ATLAS_URI;
const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

const run = async () => {
	try {
		await client.connect(() => {
			console.log('Database connection established');
		});
		// DataBase
		const db = client.db('banao');
		// Selecting Collections
		const users = db.collection('user');
		const posts = db.collection('post');

		app.get('/', (req, res) => {
			res.send('Welcome to my Application.🍃');
		});
		// create user registration route
		app.post('/register', (req, res) => {
			// Hash the password
			const hashedPassword = bcrypt.hash(req.body.password, 8, (err, hash) => {
				if (err) {
					return res.status(500).send(err);
				} else {
					// Create a new user object with hashed password
					const user = {
						name: req.body.name,
						username: req.body.username,
						email: req.body.email,
						password: hash,
					};
					// Insert the user into the database
					users.insertOne(user, (err, result) => {
						// Check if the user was inserted
						console.log(result);
						if (result.acknowledged) {
							// Return the user object
							return res.status(201).send('User Created Successfully');
						} else {
							return res.status(500).send({
								message: 'User not created',
							});
						}
					});
				}
			});
		});
		// Login the user
		app.post('/login', (req, res) => {
			// Hash the password
			const hashedPassword = bcrypt.hash(req.body.password, 8, (err, hash) => {
				if (err) {
					return res.status(500).send('Something went wrong');
				} else {
					// Find the user From the database
					users.findOne({ username: req.body.username }, (err, result) => {
						// Check if the user was found
						if (result) {
							// Check if the password is correct
							bcrypt.compare(
								req.body.password,
								result.password,
								(err, response) => {
									if (response) {
										// Return the user object
										return res.status(200).send('User Logged In Successfully');
									} else {
										return res.status(401).send('Invalid Password');
									}
								}
							);
						} else {
							return res.status(404).send('User not found');
						}
					});
				}
			});
		});
		// Forget user password
		app.post('/forget', (req, res) => {
			// Find the user From the database
			users.findOne({ email: req.body.email }, (err, result) => {
				// Check if the user was found
				if (result) {
					// Return the user object
					const secret = crypto.randomBytes(30, (err, buf) => {
						if (err) {
							return res.status(500).send('Something went wrong');
						} else {
							// Send the email
							const token = buf.toString('hex');
							const linkWithToken = `http://localhost:5000/reset?token=${token}`;
							// Save the token in the database
							users.updateOne(
								{ email: req.body.email },
								{ $set: { resetToken: token } },
								(err, result) => {
									if (result.acknowledged) {
										// Send the email
										return res.status(200).send(linkWithToken);
									} else {
										return res.status(500).send('Something went wrong');
									}
								}
							);
						}
					});
				} else {
					return res.status(404).send('User not found');
				}
			});
		});
		// Reset user password
		app.post('/reset', (req, res) => {
			// Find the user From the database
			users.findOne({ resetToken: req.query.token }, (err, result) => {
				// Check if the user was found
				if (result) {
					// Hash the password
					const hashedPassword = bcrypt.hash(
						req.body.password,
						8,
						(err, hash) => {
							if (err) {
								return res.status(500).send('Something went wrong');
							} else {
								// Update the user password
								users.updateOne(
									{ resetToken: req.query.token },
									{ $set: { password: hash, resetToken: ' ' } },
									(err, result) => {
										console.log(result);
										if (result.acknowledged) {
											// Return the user object
											return res
												.status(200)
												.send('Password Reset Successfully');
										} else {
											return res.status(500).send('Something went wrong');
										}
									}
								);
							}
						}
					);
				} else {
					return res.status(404).send('Token is invalid!');
				}
			});
		});

		// Post CRUD Operation
		// Create a post
		app.post('/posts', (req, res) => {
			// Create a new post
			const post = req.body;
			// Save the post in the database
			posts.insertOne(post, (err, result) => {
				if (err) {
					return res.status(500).send('Something went wrong');
				} else {
					return res.status(200).send('Post Created Successfully');
				}
			});
		});
		// Read all posts
		app.get('/posts', (req, res) => {
			// Find all posts
			posts.find({}).toArray((err, result) => {
				if (err) {
					return res.status(500).send('Something went wrong');
				}
				// Return the posts
				return res.status(200).send(result);
			});
		});
		// Read a post
		app.get('/posts/:id', (req, res) => {
			// Find the post
			posts.findOne({ _id: ObjectId(req.params.id) }, (err, result) => {
				if (result) {
					return res.status(200).send(result);
				} else {
					return res.status(404).send('Post not found');
				}
				// Return the post
			});
		});
		// Update a post
		app.put('/posts/:id', (req, res) => {
			// Find the post
			posts.findOne({ _id: ObjectId(req.params.id) }, (err, result) => {
				if (err) {
					return res.status(500).send('Something went wrong');
				}
				// Update the post
				posts.updateOne(
					{ _id: ObjectId(req.params.id) },
					{
						$set: req.body,
					},
					(err, result) => {
						if (err) {
							return res.status(500).send('Something went wrong');
						}
						// Return the post
						return res.status(200).send('Post Updated Successfully');
					}
				);
			});
		});
		// Delete a post
		app.delete('/posts/:id', (req, res) => {
			// Find the post
			posts.findOne({ _id: ObjectId(req.params.id) }, (err, result) => {
				if (result) {
					// Delete the post
					posts.deleteOne({ _id: ObjectId(req.params.id) }, (err, result) => {
						if (err) {
							return res.status(500).send('Something went wrong');
						}
						// Return the post
						return res.status(200).send('Post Deleted Successfully');
					});
				} else {
					return res.status(404).send('Post not found');
				}
			});
		});

		// Likes and add a comment to a post API
		// Add a like to a post
		app.post('/posts/:id/likes', (req, res) => {
			// Find the post
			posts.findOne({ _id: ObjectId(req.params.id) }, (err, result) => {
				if (result) {
					// Add a like to the post
					posts.updateOne(
						{ _id: ObjectId(req.params.id) },
						{ $push: { likes: req.body.likes } },
						(err, result) => {
							if (err) {
								return res.status(500).send('Something went wrong');
							}
							// Return the post
							return res.status(200).send('Post liked Successfully');
						}
					);
				} else {
					return res.status(404).send('Post not found');
				}
			});
		});
		// Add a comment to a post
		app.post('/posts/:id/comments', (req, res) => {
			// Find the post
			posts.findOne({ _id: ObjectId(req.params.id) }, (err, result) => {
				if (result) {
					// Add a comment to the post
					posts.updateOne(
						{ _id: ObjectId(req.params.id) },
						{ $push: { comments: req.body.comments } },
						(err, result) => {
							if (err) {
								return res.status(500).send('Something went wrong');
							}
							// Return the post
							return res.status(200).send('Comment added Successfully');
						}
					);
				}
			});
		});
		// Delete a like from a post
		app.delete('/posts/:id/likes', (req, res) => {
			// Find the post
			posts.findOne({ _id: ObjectId(req.params.id) }, (err, result) => {
				if (result) {
					// Delete the like from the post
					posts.updateOne(
						{ _id: ObjectId(req.params.id) },
						{ $pull: { likes: req.body.likes } },
						(err, result) => {
							if (err) {
								return res.status(500).send('Something went wrong');
							}
							// Return the post
							return res.status(200).send('Like deleted Successfully');
						}
					);
				} else {
					return res.status(404).send('Post not found');
				}
			});
		});
		// Delete a comment from a post
		app.delete('/posts/:id/comments', (req, res) => {
			// Find the post
			posts.findOne({ _id: ObjectId(req.params.id) }, (err, result) => {
				if (result) {
					// Delete the comment from the post
					posts.updateOne(
						{ _id: ObjectId(req.params.id) },
						{ $pull: { comments: req.body.comments } },
						(err, result) => {
							if (err) {
								return res.status(500).send('Something went wrong');
							}
							// Return the post
							return res.status(200).send('Comment deleted Successfully');
						}
					);
				} else {
					return res.status(404).send('Post not found');
				}
			});
		});
	} finally {
		// await client.close().;
	}
};
run().catch(console.dir);

// create http server
app.listen(port, () => {
	console.log(`Server started on port ${port}`);
});
