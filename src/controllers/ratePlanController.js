const RatePlan = require('../models/RatePlan');

const parseDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return null;
    }

    return date;
};

const createRatePlan = async (req, res, next) => {
    try {

        const {
            name,
            roomType,
            startDate,
            endDate,
            weekdayRate,
            weekendRate,
        } = req.body || {};

        if (typeof name !== 'string' ||
            !name.trim() ||
            typeof roomType !== 'string' ||
            !roomType.trim() ||
            startDate === undefined ||
            endDate === undefined ||
            weekdayRate === undefined ||
            weekendRate === undefined) {

            return res.status(400).json({
                success: false,
                message: 'Please provide all required rate plan fields'
            })

        }

        const start = parseDate(startDate);
        const end = parseDate(endDate);

        if (!start || !end || end < start) {

            return res.status(400).json({
                success: false,
                message: 'Please provide valid dates in YYYY-MM-DD format, with endDate on or after startDate',
            })

        }

        const plan = await RatePlan.create({
            name,
            roomType,
            startDate:start,
            endDate:end,
            weekdayRate,
            weekendRate
        });

        return res.status(201).json({
            success:true,
            message:'Seasonal rate plan created',
            data:plan
        })

    } catch (error) {
        next(error)
    }
};

const getRatePlans = async(req,res,next)=>{
    try{
        const plans = await RatePlan.find().sort({startDate: 1});

        return res.status(200).json({
            success:true,
            count:plans.length,
            data:plans
        })
    }catch(error){
        next(error);
    }
}


const deactivateRatePlan = async (req,res,next)=>{
    try{
        const plan = await RatePlan.findByIdAndUpdate(
            req.params.id,
            {isActive:false},
            {new:true, runValidators:true}
        );

        if(!plan){
            return res.status(404).json({
                success:true,
                message:'Rate plan not found'
            })
        }
        return res.status(200).json({
            success:true,
            message:'Rate plan deactivated',
        })
    }catch(error){
        next(error)
    }
};

module.exports = {
    createRatePlan,
    getRatePlans,
    deactivateRatePlan,
}