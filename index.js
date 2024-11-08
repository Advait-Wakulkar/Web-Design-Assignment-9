const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());

mongoose.connect("mongodb+srv://admin:Adv%4019082001@cluster0.gfjr4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"]
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    imagePath: {
        type: String,
        default: ''
    },
});

const userModel = mongoose.model("Users", userSchema);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype);
    if (isValid) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, and GIF are allowed."), false);
    }
};

const upload = multer({ storage, fileFilter });

async function userExists(email) {
    try {
        return await userModel.findOne({ email });
    } catch (err) {
        console.error(err);
        return null;
    }
}

function validateName(name) {
    const nameRegex = /^[a-zA-Z\s]+$/;
    return nameRegex.test(name);
}

function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zAZ0-9.-]+\.[eE][dD][uU]$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

app.post("/user/create", async (req, res) => {
    const { name, email, password } = req.body;

    if (!validateName(name)) {
        return res.status(400).json({ msg: "Name must only contain letters and spaces." });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({ msg: "Email must be a valid .edu email address." });
    }

    if (!validatePassword(password)) {
        return res.status(400).json({ msg: "Password must contain at least one uppercase letter, one digit, and one special character." });
    }

    try {
        const existingUser = await userExists(email);
        if (existingUser) {
            return res.status(400).json({ msg: "User already exists." });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds); 
        const newUser = new userModel({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ msg: `User created: ${newUser.name}` });
    } catch (err) {
        res.status(500).json({ msg: "Error creating user", error: err.message });
    }
});

app.put("/user/edit", async (req, res) => {
    const { email, name, password } = req.body;

    if (name && !validateName(name)) {
        return res.status(400).json({ msg: "Name must only contain letters and spaces." });
    }

    if (password && !validatePassword(password)) {
        return res.status(400).json({ msg: "Password must contain at least one uppercase letter, one digit, and one special character." });
    }

    try {
        const user = await userExists(email);
        if (!user) {
            return res.status(404).json({ msg: "User not found." });
        }

        if (name) {
            user.name = name;
        }

        if (password) {
            const saltRounds = 10;
            user.password = await bcrypt.hash(password, saltRounds);  
        }

        await user.save();
        res.status(200).json({ msg: `User ${user.name} updated successfully.` });
    } catch (err) {
        res.status(500).json({ msg: "Error updating user", error: err.message });
    }
});

app.delete("/user/delete", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await userExists(email);
        if (!user) {
            return res.status(404).json({ msg: "User not found." });
        }

        await userModel.deleteOne({ email });
        res.status(200).json({ msg: "User deleted successfully." });
    } catch (err) {
        res.status(500).json({ msg: "Error deleting user", error: err.message });
    }
});

app.get("/user/getAll", async (req, res) => {
    try {
        const users = await userModel.find();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ msg: "Error retrieving users", error: err.message });
    }
});

app.post("/user/uploadImage", upload.single("photo"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: "No file uploaded." });
    }

    const { email } = req.body;

    try {
        const user = await userExists(email);
        if (!user) {
            return res.status(404).json({ msg: "User not found." });
        }

        user.imagePath = req.file.path;
        await user.save();
        res.status(200).json({ msg: "File uploaded successfully.", path: req.file.path });
    } catch (err) {
        res.status(500).json({ msg: "Error saving image path", error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
});
