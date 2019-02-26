
const fs = require('fs');

const rimraf = require('rimraf');

module.exports = {
  exists,
  mkdir,
  clearDir,
  writeFile,
};

function exists(path) {
  return new Promise((resolve, reject) => {
    fs.access(path, fs.F_OK, err => {
      resolve(!err);
    });
  });
}

function mkdir(path) {
  return new Promise((resolve, reject) => {
    fs.mkdir(path, err => {
      if(err) return reject(err);
      resolve();
    });
  });
}

function clearDir(dir) {
  return new Promise((resolve, reject) => {
    rimraf(dir, err => {
      if(err) return reject(err);
      resolve();
    })
  });
}

function writeFile(filePath, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, err => {
      if(err) return reject(err);
      resolve();
    });
  });
}
