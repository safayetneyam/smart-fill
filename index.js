// const express = require("express");
const fs = require("fs");

const mongoose = require("mongoose");
const readline = require("readline");
const { readFilesFromFolder } = require("./fileProcess");
const { getInfo } = require("./database");
require("dotenv").config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askForFilePath = () => {
  return new Promise((resolve, reject) => {
    rl.question("Enter filepath: ", (path) => {
      resolve(path);
    });
  });
};

const showMenu = () => {
  console.log("\n============ Command Menu ============");
  console.log("1. Fetch new data");
  console.log("2. View Data");
  console.log("3. Exit");
  console.log("======================================");

  rl.question("Enter your choice: ", handleUserInput);
};

const handleUserInput = async (input) => {
  switch (input) {
    case "1":
      const path = await askForFilePath();
      await readFilesFromFolder(path);
      break;
    case "2":
      const data = await getInfo();
      console.log(JSON.parse(data[0].info));
      break;
    case "3":
      rl.close();
      return;
    default:
      console.log("Invalid choice. Please try again.");
  }

  setTimeout(showMenu, 1000);
  return;
};
const main = async () => {
  try {
    console.log("Working...");
    await mongoose.connect(process.env.DB_URL);

    console.log("Mongodb Connected");

    showMenu();
    return;
  } catch (error) {}
};

main();
