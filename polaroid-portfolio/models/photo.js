const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Photo', {
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filepath: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });
};
