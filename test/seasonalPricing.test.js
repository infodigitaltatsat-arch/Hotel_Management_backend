const assert = require('node:assert/strict');
const { test } = require('node:test');
const { calculateRoomTotal } = require('../src/controllers/reservationController');

const makeDate = (value) => new Date(`${value}T00:00:00.000Z`);

const familySuite = {
    roomType: 'Family Suite',
    pricePerNight: 1200,
    weekdayRate: 1000,
    weekendRate: 1500,
};

const testStay = {
    checkIn: makeDate('2026-11-05'),
    checkOut: makeDate('2026-11-09'),
};

test('uses the uniquely matching active seasonal plan for each night', () => {
    const total = calculateRoomTotal(familySuite, testStay.checkIn, testStay.checkOut, [{
        name: 'Diwali Season',
        roomType: 'Family Suite',
        startDate: makeDate('2026-11-01'),
        endDate: makeDate('2026-11-30'),
        weekdayRate: 2000,
        weekendRate: 3000,
        isActive: true,
    }]);

    assert.equal(total, 10000);
});

test('rejects overlapping active plans for the same room type and night', () => {
    const plans = [
        {
            name: 'Diwali Season',
            roomType: 'Family Suite',
            startDate: makeDate('2026-11-01'),
            endDate: makeDate('2026-11-30'),
            weekdayRate: 2000,
            weekendRate: 3000,
            isActive: true,
        },
        {
            name: 'Family Suite Holiday Rates',
            roomType: 'Family Suite',
            startDate: makeDate('2026-11-01'),
            endDate: makeDate('2026-11-30'),
            weekdayRate: 250,
            weekendRate: 350,
            isActive: true,
        },
    ];

    assert.throws(
        () => calculateRoomTotal(familySuite, testStay.checkIn, testStay.checkOut, plans),
        {
            code: 'AMBIGUOUS_RATE_PLAN',
            message: /Diwali Season, Family Suite Holiday Rates/,
        },
    );
});

test('ignores inactive and non-matching plans and falls back for uncovered nights', () => {
    const total = calculateRoomTotal(
        familySuite,
        testStay.checkIn,
        testStay.checkOut,
        [
            {
                name: 'Inactive plan',
                roomType: 'Family Suite',
                startDate: makeDate('2026-11-01'),
                endDate: makeDate('2026-11-30'),
                weekdayRate: 2000,
                weekendRate: 3000,
                isActive: false,
            },
            {
                name: 'Different room type',
                roomType: 'Pricing Test Suite',
                startDate: makeDate('2026-11-01'),
                endDate: makeDate('2026-11-30'),
                weekdayRate: 2000,
                weekendRate: 3000,
                isActive: true,
            },
            {
                name: 'Starts on checkout',
                roomType: 'Family Suite',
                startDate: makeDate('2026-11-09'),
                endDate: makeDate('2026-11-30'),
                weekdayRate: 10,
                weekendRate: 20,
                isActive: true,
            },
        ],
    );

    assert.equal(total, 5000);
});

test('falls back to pricePerNight when weekday and weekend room rates are missing', () => {
    const total = calculateRoomTotal(
        { roomType: 'Family Suite', pricePerNight: 1200 },
        testStay.checkIn,
        testStay.checkOut,
        [],
    );

    assert.equal(total, 4800);
});
