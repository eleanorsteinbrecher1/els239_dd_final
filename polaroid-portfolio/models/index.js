// models/index.js
const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
});

const Category = require('./category')(sequelize);
const Photo    = require('./photo')(sequelize);

// Associations
Photo.belongsTo(Category);
Category.hasMany(Photo);

module.exports = { sequelize, Category, Photo };
