const path = require("path");

class ModelController {
  async getLanding(req, res) {
    res.status(200);
    res.sendFile(path.join(__dirname, "..", "pages", "index.html"));
  }
  async getTemp(req, res) {
    const fileName = req.query.fileName;
    if (!fileName) {
      return res.status(400).send("No file name provided");
    }
    res.status(200);
    res.sendFile(path.join(__dirname, "..", "temp", fileName));
  }
}

module.exports = new ModelController();
