const {
    addUserHandler,
    getAllUsersHandler,
    getUserByIdHandler,
    editUserHandler,
    deleteUserByIdHandler
} = require('./handler');


const routes = [
  {
    method: 'POST',
    path: '/users',
    handler: addUserHandler
  },
  {
    method: 'GET',
    path: '/users',
    handler: getAllUsersHandler
  },
  {
    method: 'GET',
    path: '/users/{id}',
    handler: getUserByIdHandler
  },
  {
    method: 'PUT',
    path: '/users/{id}',
    handler: editUserHandler
  },
  {
    method: 'DELETE',
    path: '/users/{id}',
    handler: deleteUserByIdHandler
  }
];

module.exports = routes;