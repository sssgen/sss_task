const { v4: uuidv4 } = require("uuid");
const ApiError = require("../error/apiError");
const puppeteer = require("puppeteer");

const unzipper = require("unzipper");
const Unrar = require("node-unrar-js");

const fs = require("fs");
const path = require("path");

// Function for recursively deleting a directory and its contents
const deleteDirectory = async (directory) => {
  const files = await fs.promises.readdir(directory);
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      // If this is a directory, recursively call deleteDirectory
      await deleteDirectory(filePath);
    } else {
      // If this is a file, delete it
      await fs.promises.unlink(filePath);
    }
  }
  // Delete the directory itself after removing all its contents
  await fs.promises.rmdir(directory);
};

class ModelController {
  async getScreen(req, res, next) {
    try {
      if (!req.files || !req.files.file) {
        throw new Error("No file uploaded");
      }

      const file = req.files.file;
      const fileName = file.name;
      const uniqueFileName = uuidv4(); // Generate a unique file name

      const fileExtension = path.extname(fileName).toLowerCase();

      if (fileExtension !== ".zip" && fileExtension !== ".rar") {
        return next(
          ApiError.badRequest("Uploaded file is not a valid ZIP or RAR file")
        );
      }

      const destinationPath = path.resolve(
        __dirname,
        "static",
        uniqueFileName + path.extname(fileName)
      ); // Path for saving the file

      const staticDir = path.join(__dirname, "static"); // Directory for saving
      const outputDir = path.join(__dirname, "extracted", uniqueFileName); // Directory for extraction with a unique ID

      if (!fs.existsSync(staticDir)) {
        // Create the directory for saving if it does not exist
        fs.mkdirSync(staticDir);
      }

      if (!fs.existsSync(outputDir)) {
        // Create the directory for extraction if it does not exist
        fs.mkdirSync(outputDir, { recursive: true }); // For creating nested directories
      }

      // Saving the file
      await new Promise((resolve, reject) => {
        file.mv(destinationPath, (err) => {
          if (err) {
            return reject(
              ApiError.badRequest("Error moving file: " + err.message)
            );
          }
          resolve();
        });
      });

      // Check file extension and extract
      if (fileExtension === ".zip") {
        // Extracting ZIP file
        await fs
          .createReadStream(destinationPath)
          .pipe(unzipper.Extract({ path: outputDir })) // Use outputDir with a unique ID
          .promise();
      } else if (fileExtension === ".rar") {
        // Extracting RAR file
        const data = fs.readFileSync(destinationPath);
        const rar = Unrar(data); // Create an instance of Unrar
        const extraction = rar.extractAll(); // Extract all files
        extraction.forEach((file) => {
          if (file.fileHeader) {
            fs.writeFileSync(
              path.join(outputDir, file.fileHeader.name), // Use outputDir with a unique ID
              file.data
            ); // Save the extracted file
          }
        });
      }

      // Check for the existence of the temp directory
      const tempDir = path.join(__dirname, "..", "temp"); // Directory for saving the screenshot
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir); // Create the directory if it does not exist
      }

      // Check for the existence of index.html after extraction
      let indexFile = null;

      // Function for recursively searching for index.html
      const findIndexFile = async (dir) => {
        const files = await fs.promises.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = await fs.promises.stat(filePath);
          if (stat.isDirectory()) {
            // Recursively search in subdirectories
            const found = await findIndexFile(filePath);
            if (found) return found;
          } else if (file === "index.html") {
            return filePath; // Return the full path to index.html
          }
        }
        return null; // If not found
      };

      indexFile = await findIndexFile(outputDir); // Search for index.html

      if (indexFile) {
        const fullIndexPath = indexFile; // Full path to index.html
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.goto(`file://${fullIndexPath}`, {
          waitUntil: "networkidle0",
        });

        await page
          .screenshot({ path: path.join(tempDir, `${uniqueFileName}.png`) })
          .then(() => {
            console.log("Screenshot saved successfully");
            const imageUrl = path.join(`${uniqueFileName}.png`); // Form the URL for the client
            res.send(imageUrl);
          })
          .catch((err) => {
            console.error("Error taking screenshot:", err);
            res.status(500).send("Error taking screenshot: " + err.message);
          });
        await browser.close();
      } else {
        res.status(400).send("index.html not found at directory");
      }
    } catch (e) {
      next(ApiError.badRequest(e.message));
    } finally {
      // Deleting all folders and files in the extracted and static directories
      await deleteDirectory(path.join(__dirname, "extracted"));
      await deleteDirectory(path.join(__dirname, "static"));
    }
  }
}

module.exports = new ModelController();
