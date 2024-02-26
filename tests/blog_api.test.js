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

test('likes defaults to 0 when not specified', async () => {
  const newBlog = {
    title: 'new title',
    author: 'new author',
    url: 'www.newwebsite.com'
  };

  await api.post('/api/bloglist').send(newBlog);

  const response = await api.get('/api/bloglist');

  const { likes } = response.body[response.body.length - 1];

  assert.strictEqual(likes, 0);
});

test('fails with statuscode 400 when title or url is missing', async () => {
  let newBlog = {
    author: 'new author'
  };

  await api.post('/api/bloglist').send(newBlog).expect(400);

  newBlog = {
    title: 'new title',
    author: 'new author'
  };

  await api.post('/api/bloglist').send(newBlog).expect(400);

  newBlog = {
    author: 'new author',
    url: 'www.newwebsite.com'
  };

  await api.post('/api/bloglist').send(newBlog).expect(400);
});

test('blog is deleted', async () => {
  const blogsAtStart = await helper.blogsInDb();
  const blogToDelete = blogsAtStart[0];

  await api.delete(`/api/bloglist/${blogToDelete.id}`).expect(204);

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

after(async () => {
  await mongoose.connection.close();
  console.log('closed');
});
