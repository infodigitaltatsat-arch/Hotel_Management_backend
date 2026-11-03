const mongoose = require('mongoose');

const ratePlanSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
    },
    roomType:{
        type:String,
        required:true,
        trim:true,
    },
    startDate:{
        type:Date,
        required:true,
    },
    endDate:{
        type:Date,
        required:true,
    },
    weekdayRate:{
        type:Number,
        required:true,
        min:0
    },
    weekendRate:{
        type:Number,
        required:true,
        min:0
    },
    isActive:{
        type:Boolean,
        default:true,
    },

},
{timestamps:true});

ratePlanSchema.pre('validate',function(){
    if(
        this.startDate && 
        this.endDate &&
        this.endDate < this.startDate
    ){
        this.invalidate(
            'endDate',
            'End date must be on or after start date'
        );
    }
});

const RatePlan = mongoose.model('RatePlan',ratePlanSchema);

module.exports = RatePlan;