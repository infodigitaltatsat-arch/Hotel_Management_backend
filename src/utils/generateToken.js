const jwt = require('jsonwebtoken');

const generateToken = (userId)=>{
    if(!process.env.JWT_SECRET){
        throw new Error("Configure JWT_SECRET")
    }

    return jwt.sign({userId},process.env.JWT_SECRET,{
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    })
}

module.exports = {generateToken};