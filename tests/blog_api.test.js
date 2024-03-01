const { test, after, beforeEach, describe } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const supertest = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../app');
const helper = require('./test_helper');

const api = supertest(app);

const Blog = require('../models/blog');
const User = require('../models/user');

let token;
let user;

beforeEach(async () => {
  await Blog.deleteMany({});
  await Blog.insertMany(helper.initialBlogs);
  await User.deleteMany({});
  const passwordHash = await bcrypt.hash('sekret', 10);
  user = await new User({
    username: 'root',
    passwordHash
  }).save();
  const userForToken = {
    username: user.username,
    id: user._id
  };

  token = jwt.sign(userForToken, process.env.SECRET);
});

test('blogs are returned as json', async () => {
  await api
    .get('/api/bloglist')
    .expect(200)
    .expect('Content-Type', /application\/json/);
});

test('there are two blogs', async () => {
  const response = await api.get('/api/bloglist');

  assert.strictEqual(response.body.length, 2);
});

test('all blogs have id property rather than _id property', async () => {
  const response = await api.get('/api/bloglist');
  response.body.forEach((blog) => {
    assert.ok(blog.hasOwnProperty('id'));
    assert.ok(!blog.hasOwnProperty('_id'));
  });
});

test('a valid blog can be added', async () => {
  const newBlog = {
    title: 'new title',
    author: 'new author',
    url: 'www.newwebsite.com',
    likes: 100,
    user: {
      username: user.username,
      id: user.id
    }
  };

  await api
    .post('/api/bloglist')
    .send(newBlog)
    .set('Authorization', `Bearer ${token}`)
    .expect(201)
    .expect('Content-Type', /application\/json/);

  const response = await api.get('/api/bloglist');

  const { id, ...mostRecentBlog } = response.body[response.body.length - 1];

  assert.strictEqual(response.body.length, helper.initialBlogs.length + 1);

  console.log(mostRecentBlog, newBlog);

  assert.deepStrictEqual(mostRecentBlog, newBlog);
});

test('likes defaults to 0 when not specified', async () => {
  const newBlog = {
    title: 'new title',
    author: 'new author',
    url: 'www.newwebsite.com'
  };

  await api
    .post('/api/bloglist')
    .send(newBlog)
    .set('Authorization', `Bearer ${token}`);

  const response = await api.get('/api/bloglist');

  const { likes } = response.body[response.body.length - 1];

  assert.strictEqual(likes, 0);
});

test('fails with statuscode 400 when title or url is missing', async () => {
  let newBlog = {
    author: 'new author'
  };

  await api
    .post('/api/bloglist')
    .send(newBlog)
    .set('Authorization', `Bearer ${token}`)
    .expect(400);

  newBlog = {
    title: 'new title',
    author: 'new author'
  };

  await api
    .post('/api/bloglist')
    .send(newBlog)
    .set('Authorization', `Bearer ${token}`)
    .expect(400);

  newBlog = {
    author: 'new author',
    url: 'www.newwebsite.com'
  };

  await api
    .post('/api/bloglist')
    .send(newBlog)
    .set('Authorization', `Bearer ${token}`)
    .expect(400);
});

test('blog is deleted', async () => {
  const blogsAtStart = await helper.blogsInDb();
  const blogToDelete = blogsAtStart[0];

  await api
    .delete(`/api/bloglist/${blogToDelete.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204);

  const blogsAtEnd = await helper.blogsInDb();

  blogsAtEnd.forEach((blog) => {
    assert.notDeepStrictEqual(blog, blogToDelete);
  });

  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1);
});

test('blog is updated', async () => {
  const blogsAtStart = await helper.blogsInDb();
  const blogToUpdate = blogsAtStart[0];

  await api
    .put(`/api/bloglist/${blogToUpdate.id}`)
    .send({ ...blogToUpdate, likes: blogToUpdate.likes + 1 })
    .expect(200)
    .expect('Content-Type', /application\/json/);

  const blogsAtEnd = await helper.blogsInDb();
  const updatedBlog = blogsAtEnd[0];
  assert.strictEqual(updatedBlog.likes, blogToUpdate.likes + 1);
});

describe('when there is initially one user in db', () => {
  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: 'username',
      name: 'name',
      password: 'password'
    };

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1);

    const usernames = usersAtEnd.map((u) => u.username);
    assert(usernames.includes(newUser.username));
  });

  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: 'root',
      name: 'name',
      password: 'password'
    };

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert(result.body.error.includes('expected `username` to be unique'));

    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });

  test('creation fails with proper statuscode and message if username is shorter than 3 characters', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: 'r',
      name: 'name',
      password: 'password'
    };

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert(
      result.body.error.includes(
        'is shorter than the minimum allowed length (3)'
      )
    );

    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });

  test('creation fails with proper statuscode and message if password is shorter than 3 characters', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: 'test',
      name: 'name',
      password: 'p'
    };

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert(
      result.body.error.includes('Password must be at least 3 characters')
    );

    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });
});

describe('missing or invalid token', () => {
  test('Adding a blog fails with proper statuscode if token not provided', async () => {
    const newBlog = {
      title: 'new title',
      author: 'new author',
      url: 'www.newwebsite.com',
      likes: 100,
      user: {
        username: user.username,
        id: user.id
      }
    };

    await api
      .post('/api/bloglist')
      .send(newBlog)
      .set('Authorization', 'Bearer invalidToken')
      .expect(401);

    const response = await api.get('/api/bloglist');

    assert.strictEqual(response.body.length, helper.initialBlogs.length);
  });
});

after(async () => {
  await mongoose.connection.close();
  console.log('closed');
});
