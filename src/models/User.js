const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true,"Name is required"],
        trim:true,
        minlength:2,
        maxlength:80,
    },
    email:{
        type:String,
        required:[true,"Email is required"],
        unique:true,
        lowercase:true,
        trim:true,
        match:[/^[^\s@]+@[^\s@]+\.[^\s@]+$/,"Please provide a valid email address"],
    },
    password:{
        type:String,
        required:true,
        select:false,
    },
    role:{
        type:String,
        enum:['guest','admin','receptionist'],
        default:'guest',
        required:true,
    },
    isActive:{
        type:Boolean,
        default:true,
    },
},
{
    timestamps:true,
},);

const User = mongoose.model("User",userSchema);
module.exports = User;