const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const username = 'admin';
const password = 'password123'; // 默认密码
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) throw err;
    const authData = {
        users: [
            { username: username, passwordHash: hash }
        ]
    };
    fs.writeFileSync(path.join(__dirname, 'auth.json'), JSON.stringify(authData, null, 4));
    console.log('auth.json created with default user: admin / password123');
});
