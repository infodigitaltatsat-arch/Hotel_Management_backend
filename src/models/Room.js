const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomNumber:{
        type:String,
        required:[true,'Room number is required'],
        unique:true,
        trim:true,

    },
    roomType:{
        type:String,
        required:[true, 'Room type is required'],
        trim:true,

    },
    floor:{
        type:Number,
        required:[true, 'Room price is required'],
        min:0,

    },
    floor:{
        type:Number,
        required:[true,'Floor number is required'],
        min:0,

    },
    pricePerNight:{
        type:Number,
        required:[true,'Room price is required'],
        min:0,

    },
    capacity:{
        type:Number,
        required:[true, 'Guest capacity is required'],
        min:1,

    },
    amenities:{
        type:[String],
        default:[],

    },
    description:{
        type:String,
        trim:true,
        default:'',
    },
    status:{
        type:String,
        enum:['available','maintenance'],
        default:'available'
    },
    isActive:{
        type:Boolean,
        default:true,

    },
    bookingVersion: {
        type: Number,
        default: 0,
        select: false,
    },
    houseKeepingStatus:{
        type:String,
        enum:['clean','dirty','cleaning','inspected'],
        default:'clean'
    },
    weekdayRate:{
        type:Number,
        min:0
    },
    weekendRate:{
        type:Number,
        min:0
    },
    extraGuestCharge:{
        type:Number,
        min:0,
        default:0
    },
    
},
{timestamps:true,}
);

const Room = mongoose.model('Room',roomSchema);
module.exports = Room;