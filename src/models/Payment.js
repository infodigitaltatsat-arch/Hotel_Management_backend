const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    reservation:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Reservation',
        required:true,
    },
    amount:{
        type:Number,
        required:true,
        min:0.01,
    },
    method:{
        type:String,
        enum:['cash','upi','card','bank_transfer','other'],
        required:true,
    },
    type:{
        type:String,
        enum:['deposit','payment'],
        default:'payment'
    },
    note:{
        type:String,
        trim:true,
        maxlength:300,
        default:'',
    },
     
    receivedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
},
{timestamps:true}
);

paymentSchema.index({reservation:1,createdAt:-1});

module.exports = mongoose.model('Payment',paymentSchema);