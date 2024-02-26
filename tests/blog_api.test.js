const { test, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const supertest = require('supertest');
const { log } = require('node:console');
const app = require('../app');
const helper = require('./test_helper');

const api = supertest(app);

const Blog = require('../models/blog');

beforeEach(async () => {
  await Blog.deleteMany({});
  await Blog.insertMany(helper.initialBlogs);
});

test('notes are returned as json', async () => {
  await api
    .get('/api/bloglist')
    .expect(200)
    .expect('Content-Type', /application\/json/);
});

test('there are two notes', async () => {
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

test('a valid note can be added ', async () => {
  const newBlog = {
    title: 'new title',
    author: 'new author',
    url: 'www.newwebsite.com',
    likes: 100
  };

  await api
    .post('/api/bloglist')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/);

  const response = await api.get('/api/bloglist');

  const { id, ...mostRecentBlog } = response.body[response.body.length - 1];

  assert.strictEqual(response.body.length, helper.initialBlogs.length + 1);

  assert.deepStrictEqual(mostRecentBlog, newBlog);
});

after(async () => {
  await mongoose.connection.close();
  console.log('closed');
});
