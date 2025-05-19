const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');

const users = [];

const addUserHandler = async (request, h) => {
    const { username, email, password } = request.payload;
    
    if (users.find(u => u.username === username)) {
        return h.response({ error: 'Username sudah ada' }).code(400);}
  
    if (users.find(u => u.email === email)) {
        return h.response({ error: 'Email sudah terdaftar' }).code(400);}
        
    const id = nanoid(16);
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertedAt = new Date().toISOString();
    const updatedAt = insertedAt;
    const newUser = {
        id,
        username,
        email,
        password: hashedPassword,
        insertedAt,
        updatedAt,
    };

    users.push(newUser);

    const isSuccess = users.some((user) => user.id === id);
    if (isSuccess) {
        const response = h.response({
            status: 'success',
            message: 'User berhasil ditambahkan',
            data: { userId: id },
        });
        response.code(201);
        return response;
    }

    const response = h.response({
        status: 'fail',
        message: 'User gagal ditambahkan',
    });
    response.code(500);
    return response;
};

const getAllUsersHandler = (request, h) => {
    const safeUsers = users.map(({ password, ...rest }) => rest);

    return h.response({
        status: 'success',
        data: {
            users: safeUsers,
        },
    }).code(200);
};


const getUserByIdHandler= (request, h) =>{
    const { id } = request.params;
    const user = users.find(u => u.id === id);

    if (user) {
        return {
            status: 'success',
            data: { user },
        };
    }

    const response = h.response({
        status: 'fail',
        message: 'User tidak ditemukan',
    });
    response.code(404);
    return response;
};

const editUserHandler = async (request, h) => {
    const { id } = request.params;
    const { username, email, password } = request.payload;

    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
        return h.response({ error: 'User tidak ditemukan' }).code(404);
    }

    if (users.some((u, i) => u.username === username && i !== index)) {
        return h.response({ error: 'Username sudah ada' }).code(400);
    }

    if (users.some((u, i) => u.email === email && i !== index)) {
        return h.response({ error: 'Email sudah terdaftar' }).code(400);
    }

    let hashedPassword = users[index].password;
    if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
    }

    users[index] = {
        ...users[index],
        username,
        email,
        password: hashedPassword,
        updatedAt: new Date().toISOString(),
    };

    return h.response({ message: 'User berhasil diupdate' }).code(200);
};

function deleteUserByIdHandler(request, h) {
    const { id } = request.params;
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
        return h.response({ error: 'User tidak ditemukan' }).code(404);
    }

    users.splice(index, 1);
    return h.response({ message: 'User berhasil dihapus' }).code(200);
};

module.exports = {
  addUserHandler,
  getAllUsersHandler,
  getUserByIdHandler,
  editUserHandler,
  deleteUserByIdHandler,
};
