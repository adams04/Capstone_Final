const express = require('express')
const path = require("path");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const collection = require("./config");

const app = express()

//convert into JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



app.use(express.static(path.join(__dirname, "..", "public")));


app.get('/', (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
})

// Sign up
app.post("/signup", async (req, res) => {
    const data = {
        email: req.body.email,
        password: req.body.password,
    }
    // check if user already exists
    const existingUser = await collection.findOne({email: data.email});
    if (existingUser) {
        res.send("User with this email already exists!");
    }else {
        //hashing password
        const saltRounds = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, saltRounds);

        const userdata = await collection.insertMany(data);
        console.log(userdata);
    }
})

/*
app.post("/createtask", async (req, res) => {

})
app.get("/alltasks", (req, res) => {

})

 */

//Sign in
app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({ email: req.body.email });
        if (!check) {
            return res.send("Email not found!");
        }

        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (!isPasswordMatch) {
            return res.send("Wrong password!");
        }

        res.render("home");
    } catch (error) {
        console.error(error);
        res.send("Something went wrong. Please try again.");
    }
});

const port = 5000
app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})