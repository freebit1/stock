const mysql = require("mysql-await");
//env설정
const env = require('dotenv');
env.config();


const db = {
    connectionLimit: 10,
    host: process.env.DB_HOST,  //  '219.251.107.32' ,
    user: process.env.DB_USER, //'dev_ph', 
    password: process.env.DB_PASSWORD, //'Azalbe_#07@', 
    database: process.env.DB_DATABASE, //'owen_test',
    port: process.env.DB_PORT, //'3306',
};


const connection = mysql.createPool(db);

module.exports = connection;

/*
host: 'localhost',
port: '3306',
user: 'cjk',
password: 'root',
database: 'msgboard',
connectionLimit : 10
};
*/