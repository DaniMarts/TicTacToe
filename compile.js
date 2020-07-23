const fs = require('fs');
const { exec, execSync, execFile } = require('child_process');
// const npm = require('npm');
const {series} = require('async');
// import {series} from 'async_hooks';

// console.log(process.platform);
// process.chdir("front");
// console.log("starting the backend and the frontend")
series([
    exec(`${process.chdir("front")}`),
    exec("npm start"),
    // () => {const serverScript = require('./server')}

])
// exec("npm start");
// console.log('started frontend');
// const serverScript = require('./server.js');
// execFile(`${serverScript}`);
// console.log('started backend');