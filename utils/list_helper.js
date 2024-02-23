const _ = require('lodash');

const dummy = (blogs) => 1;

const totalLikes = (arr) =>
  arr.length === 0 ? 0 : arr.reduce((sum, obj) => sum + obj.likes, 0);

const favoriteBlog = (arr) => {
  if (arr.length === 0) return {};

  const { title, author, likes } = arr.reduce(
    (max, blog) => (max.likes > blog.likes ? max : blog),
    arr[0]
  );
  return { title, author, likes };
};

const mostBlogs = (arr) => {
  if (arr.length === 0) return {};

  const groupByAuthor = _.groupBy(arr, 'author');
  const authorWithMostBlogs = _.maxBy(
    _.keys(groupByAuthor),
    (author) => groupByAuthor[author].length
  );
  return {
    author: authorWithMostBlogs,
    blogs: groupByAuthor[authorWithMostBlogs].length
  };
};

function mostLikes(arr) {
  if (arr.length === 0) return {};

  const groupByAuthor = _.groupBy(arr, 'author');
  const authorsWithLikes = _.map(groupByAuthor, (blogs, author) => ({
    author,
    likes: _.sumBy(blogs, 'likes')
  }));
  const authorWithMostLikes = _.maxBy(authorsWithLikes, 'likes');
  return authorWithMostLikes;
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes
};
