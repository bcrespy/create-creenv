#!/usr/bin/env node

var program = require('commander');

program
  .arguments('<dest>')
  .option('-o --open <open>', 'If you want to enter the folder after installation')
  .action(function (file) {
    console.log(file);
  })
  .parse(process.argv);