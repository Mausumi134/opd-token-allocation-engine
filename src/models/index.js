// Data Models for OPD Token Allocation System

/**
 * Doctor Model
 */
class Doctor {
  constructor(id, name, specialization, workingHours) {
    this.id = id;
    this.name = name;
    this.specialization = specialization;
    this.workingHours = workingHours; // { start: '09:00', end: '17:00' }
    this.slots = new Map(); // Map of timeSlot -> Slot object
  }
}

/**
 * Time Slot Model
 */
class Slot {
  constructor(doctorId, startTime, endTime, maxCapacity = 10) {
    this.doctorId = doctorId;
    this.startTime = startTime; // '09:00'
    this.endTime = endTime;     // '10:00'
    this.maxCapacity = maxCapacity;
    this.tokens = []; // Array of Token objects
    this.availableCapacity = maxCapacity;
  }

  addToken(token) {
    if (this.availableCapacity > 0) {
      this.tokens.push(token);
      this.availableCapacity--;
      return true;
    }
    return false;
  }

  removeToken(tokenId) {
    const index = this.tokens.findIndex(t => t.id === tokenId);
    if (index !== -1) {
      this.tokens.splice(index, 1);
      this.availableCapacity++;
      return true;
    }
    return false;
  }
}

/**
 * Token Model
 */
class Token {
  constructor(patientId, doctorId, slotTime, source, priority = 1) {
    this.id = require('uuid').v4();
    this.patientId = patientId;
    this.doctorId = doctorId;
    this.slotTime = slotTime;
    this.source = source; // 'online', 'walkin', 'priority', 'followup'
    this.priority = priority; // Higher number = higher priority
    this.status = 'allocated'; // 'allocated', 'confirmed', 'cancelled', 'completed', 'no-show'
    this.createdAt = new Date();
    this.estimatedTime = null; // Estimated appointment time within the slot
  }
}

/**
 * Patient Model
 */
class Patient {
  constructor(id, name, phone, type = 'regular') {
    this.id = id;
    this.name = name;
    this.phone = phone;
    this.type = type; // 'regular', 'priority', 'emergency', 'followup'
  }
}

/**
 * Token Source Types and Priorities
 */
const TOKEN_SOURCES = {
  EMERGENCY: { name: 'emergency', priority: 10 },
  PRIORITY: { name: 'priority', priority: 8 },
  FOLLOWUP: { name: 'followup', priority: 6 },
  ONLINE: { name: 'online', priority: 4 },
  WALKIN: { name: 'walkin', priority: 2 }
};

/**
 * Token Status Types
 */
const TOKEN_STATUS = {
  ALLOCATED: 'allocated',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no-show'
};

module.exports = {
  Doctor,
  Slot,
  Token,
  Patient,
  TOKEN_SOURCES,
  TOKEN_STATUS
};