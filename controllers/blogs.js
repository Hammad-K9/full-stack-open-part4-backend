const blogsRouter = require('express').Router();
const jwt = require('jsonwebtoken');
const Blog = require('../models/blog');
const User = require('../models/user');
const middleware = require('../utils/middleware');

blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 });
  response.json(blogs);
});

blogsRouter.post('/', middleware.userExtractor, async (request, response) => {
  const { body, user } = request;

  const blog = new Blog({ ...body, likes: body.likes || 0, user: user.id });

  const savedBlog = await blog.save();
  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();
  response.status(201).json(savedBlog);
});

blogsRouter.delete(
  '/:id',
  middleware.userExtractor,
  async (request, response) => {
    const { user } = request;
    user.blogs = user.blogs.filter(
      (b) => b.id.toString() !== request.params.id
    );
    await user.save();
    await Blog.findByIdAndDelete(request.params.id);
    response.status(204).end();
  }
);

blogsRouter.put('/:id', async (request, response) => {
  const blog = { ...request.body };

  const updatedContact = await Blog.findByIdAndUpdate(request.params.id, blog, {
    new: true
  });
  response.json(updatedContact);
});

module.exports = blogsRouter;
