const { test, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const supertest = require('supertest');
const { log } = require('node:console');
const app = require('../app');

const api = supertest(app);

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

after(async () => {
  await mongoose.connection.close();
  console.log('closed');
});
