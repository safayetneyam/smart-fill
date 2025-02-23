// const express = require("express");
const fs = require("fs");

const mongoose = require("mongoose");
const readline = require("readline");
const { readFilesFromFolder } = require("./fileProcess");
const { getInfo } = require("./database");
const { deleteInfo } = require("./database");
const { retriveData } = require("./retrieve");
const { extractLabelsFromFile } = require("./extractLabels"); // New file
const { extractTextFromGoogleDocs } = require("./extractFromGoogleDocs"); // Import the new function

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

const askForGoogleDocsLink = () => {
  return new Promise((resolve, reject) => {
    rl.question("Enter Docs link: ", (link) => {
      resolve(link);
    });
  });
};

const askForPrompt = () => {
  return new Promise((resolve, reject) => {
    rl.question("Ask for an information: ", (prompt) => {
      const allInformation = getInfo().then((data) => {
        if (data.length === 0) {
          // console.log("No information available.");
          resolve("No information available.");
        } else {
          const info = retriveData(data[0].info, prompt);
          resolve(info);
        }
        // const info = retriveData(data[0].info, prompt);
        // resolve(info);
      });
    });
  });
};

const showMenu = () => {
  console.log("\n============ Command Menu ============");
  console.log("1. Fetch new data");
  console.log("2. Query for information.");
  console.log("3. Delete all stored data");
  console.log("4. Extract Lables from File");
  console.log("5. Extract Labels from Link");
  console.log("6. Exit");
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
      const data = await askForPrompt();
      console.log(data);
      // console.log(JSON.parse(data[0].info));
      break;
    case "3":
      await deleteInfo();
      console.log("All stored data has been deleted. ❌");
      break;
    case "4": // New Case for Extracting Labels
      const filePath = await askForFilePath();
      await extractLabelsFromFile(filePath);
      break;
    case "5":
      const docLink = await askForGoogleDocsLink();
      await extractTextFromGoogleDocs(docLink);
      break;
    case "6":
      rl.close();
      console.log("⛔ Stopping the project by Nodemon Crash...");
      process.kill(process.pid); // Kills the entire process, even under Nodemon
      break;
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
