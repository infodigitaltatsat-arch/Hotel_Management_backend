const Room = require('../models/Room');

const createRoom = async (req, res, next) => {
    try {
        const {
            roomNumber,
            roomType,
            floor,
            pricePerNight,
            weekdayRate,
            weekendRate,
            extraGuestCharge,
            capacity,
            amenities,
            description,
        } = req.body;

        if (
            !roomNumber?.trim() ||
            !roomType?.trim() ||
            floor === undefined ||
            pricePerNight === undefined ||
            capacity === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required room details'
            });
        }

        const existingRoom = await Room.findOne({
            roomNumber: roomNumber.trim(),
        });

        if (existingRoom) {
            return res.status(409).json({
                success: false,
                message: "Room number already exists",
            });
        }

        const room = await Room.create({
            roomNumber,
            roomType,
            floor,
            pricePerNight,
            weekdayRate,
            weekendRate,
            extraGuestCharge,
            capacity,
            amenities,
            description,
        });

        return res.status(201).json({
            success: true,
            message: "Room created successfully",
            data: room,
        })
    } catch (error) {
        next(error);
    }
};

const getRooms = async (req, res, next) => {
    try {
        const rooms = await Room.find({ isActive: true }).sort({ roomNumber: 1 });
        return res.status(200).json({
            success: true,
            count: rooms.length,
            data: rooms,
        })
    } catch (error) {
        next(error)
    }
};

const updateRoom = async (req, res, next) => {
    try {
        const allowedFields = [
            'roomNumber',
            'roomType',
            'floor',
            'pricePerNight',
            'weekdayRate',
            'weekendRate',
            'extraGuestCharge',
            'capacity',
            'amenities',
            'description',
            'status',
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];

            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one field to update"
            });
        }

        const room = await Room.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                new: true,
                runValidators: true,
            }
        );
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Room updated successfully',
            data: room,
        });
    } catch (error) {
        next(error)
    }
};

const deactivateRoom = async (req, res, next) => {
    try {
        const room = await Room.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Room deactivated successfully',
            data: room,
        })
    } catch (error) {
        next(error);
    }
};

const activateRoom = async (req, res, next) => {
    try {
        const room = await Room.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true, runValidators: true },
        );

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Room activated successfully',
            data: room,
        });
    } catch (error) {
        next(error);
    }
};

const updateHouseKeepingStatus = async(req,res,next)=>{
    try{
        const {houseKeepingStatus} = req.body || {};

        const allowedStatuses = [
            'clean','dirty','cleaning','inspected'
        ];

        if(!allowedStatuses.includes(houseKeepingStatus)){
            return res.status(400).json({
                success:false,
                message:'Invalid houseKeeping Status'
            })
        }

        const room = await Room.findByIdAndUpdate(
            req.params.id,
            {houseKeepingStatus},
            {new:true, runValidators:true}
        );

        if(!room){
            return res.status(404).json({
                success:false,
                message:'Room not found'
            })
        }

        return res.status(200).json({
            success:true,
            message:'HouseKeeping Status updated successfully',
            data:room,
        })
    }
    catch(error){
        next(error)
    }
};



module.exports = {
    createRoom,
    getRooms,
    updateRoom,
    deactivateRoom,
    activateRoom,
    updateHouseKeepingStatus,
};