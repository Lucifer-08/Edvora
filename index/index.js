import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from 'cors';
import bodyParser from "body-parser";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import bcrypt from "bcrypt";
import fs from "fs";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import otp from "otp";
import { sendEmail } from "./sendMail.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

mongoose.connect("mongodb://127.0.0.1:27017/Users", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});
const User = mongoose.model("User", UserSchema);

const reviewSchema = new mongoose.Schema({
  username: String,
  institute: String,
  subject: String,
  review: String,
  createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model("Review", reviewSchema);


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
  secret: "felerooutofcontrol",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: "354957478411-h0bfb58cnidfufitj1s4tqiteqih64f6.apps.googleusercontent.com",
  clientSecret: "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",
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const existingUser = await User.findOne({ email: profile.emails[0].value });
    if (existingUser) return done(null, existingUser);
    const newUser = await User.create({
      username: profile.displayName,
      email: profile.emails[0].value,
      password: ""
    });
    return done(null, newUser);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ⬇️ Middleware to pass auth info to all EJS templates //!
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

app.get("/", async (req, res) => {
  try {
    const reviews = await Review.find(); // Fetch all reviews from DB
    res.render("index", {
      reviews,
    });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.render("index", { reviews: [] });
  }
});


app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/");
  } else {
    res.render("loginSignup");
  }
});

app.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect("/");
  });
});

app.get("/myProfile", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("Profile", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

app.get("/edit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("edit-profile", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

app.post("/edit", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const { username, email } = req.body;

  try {
    await User.findByIdAndUpdate(req.user._id, { username, email });

    // Optionally update the session user
    req.user.username = username;
    req.user.email = email;

    res.redirect("/myProfile");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating profile");
  }
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
app.get("/save", async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login"); // If not authenticated, redirect to login
  }

  try {
    // Assuming you're updating the user's data (e.g., username or email)
    req.user.username = "newUsername"; // Example: change username
    req.user.email = "newEmail@example.com"; // Example: change email

    // Save the updated user data
    await req.user.save();

    // Render the profile page after saving
    res.render("profile", { user: req.user });
  } catch (err) {
    next(err); // If there's an error, pass it to the error handler
  }
});



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

app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"]
}));

app.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    successRedirect: "/"
  })
);

let genOtp;
let signup;
let forPass;

app.post("/submitSig", async (req, res) => {
  const { username, email, password, conPassword } = req.body;
  signup = true;
  if (!username || !email || !password || password !== conPassword) {
    return res.status(400).send("Invalid signup details");
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const otpGen = new otp();
  genOtp = otpGen.totp();

  try {
    await sendEmail({
      to: email,
      subject: "Otp Verification",
      html: `<h1>Otp Verification!</h1><p>Your verification code is ${genOtp}</p>`,
    });
    req.session.pendingUser = { username, email, password: hashedPassword };
    res.render("otp");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error sending OTP");
  }
});

app.get("/forget", (req, res) => {
  res.render("forgotPassword");
});

app.post("/forget", async (req, res) => {
  const mail = req.body.email;
  forPass = true;
  const Otp = new otp();
  genOtp = Otp.totp();

  try {
    await sendEmail({
      to: mail,
      subject: "Otp Verification",
      html: `<h1>Otp Verification!</h1><p>Your verification code is ${genOtp}</p>`,
    });
    res.render("otp");
  } catch (err) {
    res.status(500).send("Error sending OTP");
  }
});

app.post("/otpVerify", async (req, res) => {
  const otpCurr = req.body.OTP;
  if (otpCurr === genOtp) {
    try {
      const newUser = new User(req.session.pendingUser);
      await newUser.save();
      delete req.session.pendingUser;
      if (signup) res.redirect("/login");
      else res.render("createPassword");
    } catch (err) {
      res.status(500).send("Error saving user after OTP");
    }
  } else {
    res.render("otp");
  }
});

app.post("/submitLog", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send("User not found");

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).send("Incorrect password");

    req.login(user, err => {
      if (err) return res.status(500).send("Login failed");
      res.redirect("/"); //!
    });
  } catch (err) {
    res.status(500).send("Server error during login");
  }
});

app.post("/create", (req, res) => {
  if(req.body.newPass !== req.body.confPass) {
    return res.render("createPassword", { error: "Password not matching!" });
  }
  res.render("loginSignup");
});

app.get("/review", (req, res) => {
  res.render("review");
});

app.post("/subRev", async (req, res) => {
  try {
    const { username, institute, subject, review } = req.body;
    const newReview = new Review({ username, institute, subject, review });
    await newReview.save();
    res.render("review");
  } catch (error) {
    res.status(500).send("Error saving your review");
  }
});

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);
  socket.on("set username", (username) => {
    socket.username = username;
  });
  socket.on("chat message", (msg) => {
    const messageWithUser = {
      username: socket.username || "Anonymous",
      text: msg,
    };
    io.emit("chat message", messageWithUser);
  });
  socket.on("disconnect", () => {
    console.log("🔌 User disconnected:", socket.id);
  });
});

const data = JSON.parse(fs.readFileSync('./College_data.json', 'utf8'));

const scoreCollege = (college, preferences) => {
  const placement = parseFloat(college.Placement || 0);
  const infra = parseFloat(college.Infrastructure || 0);
  const faculty = parseFloat(college.Faculty || 0);
  const academic = parseFloat(college.Academic || 0);

  return (
    placement * preferences.placement +
    infra * preferences.infrastructure +
    faculty * preferences.faculty +
    academic * preferences.academic
  );
};

app.post('/api/recommend', (req, res) => {
  const { stream, state, maxFee, preferences } = req.body;

  const filtered = data
    .filter(c =>
      (!stream || c.Stream === stream) &&
      (!state || c.State.toLowerCase().includes(state.toLowerCase())) &&
      (parseInt((c.UG_fee || '0').replace(/,/g, '')) <= (parseInt(maxFee) || Infinity))
    )
    .map(c => ({ ...c, score: scoreCollege(c, preferences) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  res.json(filtered);
});

server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});