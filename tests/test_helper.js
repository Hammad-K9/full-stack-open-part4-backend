const Blog = require('../models/blog');
const User = require('../models/user');

const initialBlogs = [
  {
    title: 'title1',
    author: 'author1',
    url: 'www.website1.com',
    likes: 1
  },
  {
    title: 'title2',
    author: 'author2',
    url: 'www.website2.com',
    likes: 2
  }
];

const nonExistingId = async () => {
  const blog = new Blog({
    title: 'blah',
    author: 'blah',
    url: 'www.blah.com',
    likes: 0
  });
  await blog.save();
  await blog.deleteOne();

  return blog.id.toString();
};

const blogsInDb = async () => {
  const blogs = await Blog.find({});
  return blogs.map((b) => b.toJSON());
};

const usersInDb = async () => {
  const users = await User.find({});
  return users.map((u) => u.toJSON());
};

module.exports = {
  initialBlogs,
  nonExistingId,
  blogsInDb,
  usersInDb
};
