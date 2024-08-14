require("dotenv").config();
const express = require("express");
const fileUpload = require("express-fileupload");
const errorHandler = require("./middleware/ErrorHandlingMiddleware.js");
const path = require("path");
const mainController = require("./controllers/mainController.js");
const screenController = require("./controllers/screenController.js");
const fs = require("fs");

const PORT = process.env.SERVER_PORT || 5000;

const app = express();

app.use(express.json());
app.use(express.static(path.resolve(__dirname, "temp")));
app.use(express.static(path.join(__dirname, "pages")));
app.use(fileUpload({}));
app.use(errorHandler);

app.get("/", mainController.getLanding);
app.post("/api/screen", screenController.getScreen);

const cleanTempFolder = () => {
  const tempPath = path.resolve(__dirname, "temp");
  if (tempPath) {
    fs.readdir(tempPath, (err, files) => {
      if (err) throw err;
      files.forEach((file) => {
        fs.unlink(path.join(tempPath, file), (err) => {
          if (err) throw err;
        });
      });
    });
  }
};

// Clean the temp folder every 5 seconds
setInterval(cleanTempFolder, 5000);

const start = async () => {
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
};

start();
