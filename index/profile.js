import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/Users", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Ensure upload directory exists
const uploadsPath = __dirname + "/public/uploads";
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Define schema
const profileSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  email: String,
  college: String,
  address: String,
  photo: String,
});

const Profile = mongoose.model("Profile", profileSchema);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/profile.html");
});

app.get("/edit", (req, res) => {
  res.sendFile(__dirname + "/public/edit-profile.html");
});

app.post("/prof", upload.single("photo"), (req, res) => {
  const newProfile = new Profile({
    name: req.body.name,
    mobile: req.body.mobile,
    email: req.body.email,
    college: req.body.college,
    address: req.body.address,
    photo: req.file ? "/uploads/" + req.file.filename : "",
  });

  newProfile.save()
    .then(() => {
      console.log("Profile saved:", newProfile);
      res.redirect("/save");
    })
    .catch((err) => {
      console.error("Error saving profile:", err);
      res.status(500).send("Something went wrong");
    });
});

// Serve final profile page
app.get("/save", (req, res) => {
  res.sendFile(__dirname + "/public/profile.html");
});

// API endpoint to fetch latest profile
app.get("/api/profile", async (req, res) => {
  try {
    const profile = await Profile.findOne().sort({ _id: -1 });
    if (!profile) {
      return res.status(404).json({ message: "No profile found" });
    }
    res.json(profile);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
