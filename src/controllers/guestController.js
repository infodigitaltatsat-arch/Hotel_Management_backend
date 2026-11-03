const Reservation = require('../models/Reservation');

const getGuestRecords = async(req,res,next)=>{
    try{
        const reservations = await Reservation.find()
            .populate('guest','name email')
            .populate('room','roomNumber roomType')
            .sort({createdAt:-1});

        const search = (req.query.search || '').trim().toLowerCase();
        const guests = new Map();

        for(const reservation of reservations){
            const guest = reservation.guest;

            if(!guest) continue;

            const name = guest.name || '';
            const email = guest.email || '';

            if(search && !name.toLowerCase().includes(search) && !email.toLowerCase().includes(search)){
                continue;
            }

            const guestId = guest._id.toString();

            if(!guests.has(guestId)){
                guests.set(guestId,{
                    _id:guest._id,
                    name,
                    email,
                    reservations:[],
                });
            }

            guests.get(guestId).reservations.push({
                _id:reservation._id,
                bookingReference:reservation.bookingReference,
                room:reservation.room,
                checkIn:reservation.checkIn,
                checkOut:reservation.checkOut,
                totalPrice:reservation.totalPrice,
                bookingStatus:reservation.bookingStatus,
                paymentStatus:reservation.paymentStatus,
            })
        }

        return res.status(200).json({
            success:true,
            count:guests.size,
            data:Array.from(guests.values()),
        })

    }catch(error){
        next(error)
    }
}

module.exports = {getGuestRecords};