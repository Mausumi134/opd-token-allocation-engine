const express = require('express');
const { Doctor, Patient, TOKEN_SOURCES } = require('../models');
const TokenAllocationEngine = require('../services/TokenAllocationEngine');

const router = express.Router();
const engine = new TokenAllocationEngine();

/**
 * @route POST /api/doctors
 * @desc Add a new doctor to the system
 */
router.post('/doctors', (req, res) => {
  try {
    const { id, name, specialization, workingHours } = req.body;
    
    if (!id || !name || !specialization || !workingHours) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: id, name, specialization, workingHours' 
      });
    }

    const doctor = new Doctor(id, name, specialization, workingHours);
    engine.addDoctor(doctor);

    res.status(201).json({
      success: true,
      message: 'Doctor added successfully',
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        workingHours: doctor.workingHours
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/doctors
 * @desc Get all doctors
 */
router.get('/doctors', (req, res) => {
  try {
    const doctors = Array.from(engine.doctors.values()).map(doctor => ({
      id: doctor.id,
      name: doctor.name,
      specialization: doctor.specialization,
      workingHours: doctor.workingHours
    }));

    res.json({
      success: true,
      doctors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/tokens/allocate
 * @desc Allocate a new token
 */
router.post('/tokens/allocate', (req, res) => {
  try {
    const { patientId, doctorId, preferredTime, source } = req.body;

    if (!patientId || !doctorId || !preferredTime || !source) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId, doctorId, preferredTime, source'
      });
    }

    // Validate source
    const validSources = Object.values(TOKEN_SOURCES).map(s => s.name);
    if (!validSources.includes(source)) {
      return res.status(400).json({
        success: false,
        message: `Invalid source. Valid sources: ${validSources.join(', ')}`
      });
    }

    const result = engine.allocateToken(patientId, doctorId, preferredTime, source);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(200).json(result); // Still return 200 for waiting queue
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/tokens/emergency
 * @desc Insert emergency token
 */
router.post('/tokens/emergency', (req, res) => {
  try {
    const { patientId, doctorId, urgentTime } = req.body;

    if (!patientId || !doctorId || !urgentTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId, doctorId, urgentTime'
      });
    }

    const result = engine.insertEmergencyToken(patientId, doctorId, urgentTime);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route DELETE /api/tokens/:tokenId
 * @desc Cancel a token
 */
router.delete('/tokens/:tokenId', (req, res) => {
  try {
    const { tokenId } = req.params;
    const result = engine.cancelToken(tokenId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/doctors/:doctorId/schedule
 * @desc Get doctor's schedule for the day
 */
router.get('/doctors/:doctorId/schedule', (req, res) => {
  try {
    const { doctorId } = req.params;
    const schedule = engine.getDoctorSchedule(doctorId);
    
    if (schedule) {
      res.json({
        success: true,
        schedule
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/stats
 * @desc Get system statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = engine.getSystemStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/waiting-queue
 * @desc Get current waiting queue
 */
router.get('/waiting-queue', (req, res) => {
  try {
    const waitingQueue = engine.waitingQueue.map(token => ({
      id: token.id,
      patientId: token.patientId,
      doctorId: token.doctorId,
      preferredTime: token.slotTime,
      source: token.source,
      priority: token.priority,
      createdAt: token.createdAt
    }));

    res.json({
      success: true,
      waitingQueue,
      count: waitingQueue.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/token-sources
 * @desc Get available token sources and their priorities
 */
router.get('/token-sources', (req, res) => {
  try {
    res.json({
      success: true,
      sources: TOKEN_SOURCES
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;