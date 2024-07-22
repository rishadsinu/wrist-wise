const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/wrist_wise')

    .then(() => console.log("MongoDB connected successfully"))
    .catch(err => console.error("MongoDB connection error:", err));



const nocache = require("nocache");

const express = require("express");
const app = express()
app.use(nocache());


const path = require('path');


app.use("/assets", express.static(path.join(__dirname, "public/user")));  // Set user assets






const userRoute = require('./routes/userRoute');
app.use('/', userRoute)






app.listen(3030, () => {
    console.log(("litsening to the server on http://localhost:3030"));
})

