const express = require("express")
require('dotenv').config();
const mongoose = require("mongoose")
const nodemailer = require('nodemailer');
const app = express()
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const key = 'jwt_token'

app.use(cors())
app.use(express.urlencoded({ extended: false })) // getting data from index.ejs
app.set("view engine", "ejs")      // To get react in node
const mongourl = "mongodb+srv://Jak:Sjakeer201@cluster0.5y48ina.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

mongoose.connect(mongourl).then(() => { console.log("Mongoose Connected") }).catch((e) => console.log(e))


app.use(express.json())

const port = process.env.PORT || 3010;

app.listen(port, () => {
    console.log("Server Started")
})



app.post("/post", async (req, res) => {
    try {
        res.send("Success")
    } catch (error) {
        console.log(error)
        res.send(error)
    }
})


require('./userdetails')

const User = mongoose.model("UserInfo")

app.post("/register", async (req, res) => {

    try {
        const { username, email, password } = req.body
        const hasedPassword = await bcrypt.hash(password, 10)
        console.log(hasedPassword)
        const oldUser = await User.findOne({ email })
        if (oldUser) {
            res.send({ status: "user already created" })
            return
        }
        await User.create({
            username, email, password: hasedPassword
        })
        res.send({ status: "User Created Successfully" })
    } catch (error) {
        console.log({ "Error Response": error })
    }
})

app.post("/login", async (req, res) => {
    const { email, password } = req.body
    const oldUser = await User.findOne({ email })
    if (oldUser == null) {
        res.send({ status: "User Not Found" })
        return
    }
    if (await bcrypt.compare(password, oldUser.password)) {
        const token = jwt.sign({ email }, key, { expiresIn: "10m" })
        if (res.status(201)) {
            console.log(token)
            return res.send({ status: "Login Successfully", token })

        } else {
            return res.send({ status: "error occur" })
        }
    }
    res.send({ status: "Incorrect Password" })
    res.status(400)
})

app.post("/user-details", async (req, res) => {
    const { token } = req.body
    try {
        const user = jwt.verify(token, key)
        const email = user.email
        User.findOne({ email })
            .then((data) => {
                res.send({ status: "ok", data })
            })
            .catch((error) => {
                res.send({ status: "error", data: error })
            })

    } catch (error) {
        res.send({ status: error })
    }
})

app.post("/forget-password", async (req, res) => {
    const { email } = req.body
    console.log(email)
    try {
        const oldUser = await User.findOne({ email })
        if (!oldUser) {
            res.send({ status: "email not register", ok: "error" })
            return
        }
        const secret = key + oldUser.password
        const token = jwt.sign({ email: oldUser.email, id: oldUser.id }, secret, { expiresIn: "30m" })
        const link = `https://register-app-node-js-with-mongodb-cbrm.onrender.com/reset-password/${oldUser._id}/${token}`
        console.log(link)
        res.send({ link })

        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'sjakeerhussain244@gmail.com',
                pass: 'tixiwopsavzoevkb'
            }
        });

        var mailOptions = {
            from: 'youremail@gmail.com',
            to: email,
            subject: 'Password Reset',
            text: link
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

    } catch (error) {
        res.send(error)
    }
})

app.get('/reset-password/:id/:token', async (req, res) => {
    const { id, token } = req.params
    try {
        const oldUser = await User.findOne({ _id: id })
        if (!oldUser) {
            res.send({ status: "User Not Exits" })
            return
        }
        const secret = key + oldUser.password
        const verify = jwt.verify(token, secret)

        res.render("index", { email: verify.email, status: "un verified" })

    } catch (error) {
        res.send(error)
    }
})

app.post('/reset-password/:id/:token', async (req, res) => {
    const { id, token } = req.params
    const { password, confirmpassword } = req.body

    if (password !== confirmpassword) {
        res.json({ status: "both passwords are to be same" })
        return
    }

    try {
        const oldUser = await User.findOne({ _id: id })
        const secret = key + oldUser.password
        const verify = jwt.verify(token, secret)
        if (!oldUser) {
            res.send({ status: "User Not Exits" })
            return
        }
        const encryptedPass = await bcrypt.hash(password, 10)
        await User.updateOne({
            _id: id,
        }, {
            $set: {
                password: encryptedPass
            }
        })

        console.log("Password Changed")
        res.render("index", { email: verify.email, status: "verified" })

    } catch (error) {
        res.send({ error })
    }
})