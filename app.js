const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, `userData.db`);
let db = null;

const initializeDbAndStartServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Started And Running at: http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDbAndStartServer();
//------------------------------------------------------
const isUserExistInUserTable = async (username) => {
  const getUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const user = await db.get(getUserQuery);
  if (user === undefined) {
    return false;
  } else {
    return true;
  }
  console.log(user);
};
const createUserQueryForUserTable = (
  username,
  name,
  encryptedPassword,
  gender,
  location
) => {
  return `INSERT INTO user(username,name,password,gender,location) 
                Values('${username}','${name}','${encryptedPassword}','${gender}','${location}');`;
};
//------------------------------------------------------
//GET http://localhost:3000/all
app.get("/all", async (request, response) => {
  const getAllUsersQuery = `SELECT * FROM user;`;
  const usersArray = await db.all(getAllUsersQuery);
  console.log(usersArray.length);
  response.send(usersArray);
});

// Add User API (1)
// POST http://localhost:3000/register
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const encryptedPassword = await bcrypt.hash(password, 10);
  if (await isUserExistInUserTable(username)) {
    response.status(400);
    response.send("User already exists");
  } else if (password.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    const query = createUserQueryForUserTable(
      username,
      name,
      encryptedPassword,
      gender,
      location
    );
    const dbResponse = await db.run(query);
    response.status(200);
    response.send("User created successfully");
  }
});

// User Login API (2)
// POST http://localhost:3000/login
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  if ((await isUserExistInUserTable(username)) === false) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const getUserQuery = `SELECT * FROM user WHERE username='${username}';`;
    const user = await db.get(getUserQuery);
    const presentPassword = user.password;
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword === false) {
      response.status(400);
      response.send("Invalid password");
    } else {
      response.status(200);
      response.send("Login success!");
    }
  }
});

// Change Password API (3)
// PUT http://localhost:3000/change-password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const user = await db.get(getUserQuery);
  const presentPassword = user.password;
  const encryptedNewPassword = await bcrypt.hash(newPassword, 10);
  const isSamePassword = await bcrypt.compare(oldPassword, user.password);
  if (isSamePassword === false) {
    response.status(400);
    response.send("Invalid current password");
  } else if (newPassword.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    const updateUserQuery = `UPDATE user SET
                        password = '${encryptedNewPassword}'
                        WHERE username='${username}';`;
    const dbResponse = await db.run(updateUserQuery);
    response.status(200);
    response.send("Password updated");
  }
});

module.exports = app;
